using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NemediClinic.Api.Services;
using NemediClinic.Application.Interfaces;
using NemediClinic.Domain.Entities;
using NemediClinic.Domain.Enums;
using NemediClinic.Infrastructure.Persistence;

namespace NemediClinic.Api.Controllers;

/// <summary>
/// Utilidades SOLO para desarrollo. Cualquier endpoint aquí responde 404
/// fuera de ASPNETCORE_ENVIRONMENT=Development.
/// </summary>
[ApiController]
[Route("api/v1/dev")]
[AllowAnonymous]
public class DevController : ControllerBase
{
    private const string DemoCedulaMarker = "1000000001";
    private const string SuperAdminPassword = "Admin2026!";
    private const string EsteticistaPassword = "Demo2026!";

    private readonly AppDbContext _db;
    private readonly ITenantProvider _tenantProvider;
    private readonly IWebHostEnvironment _env;
    private readonly DemoImageSeeder _images;
    private readonly PatientPackageService _packages;

    public DevController(AppDbContext db, ITenantProvider tenantProvider, IWebHostEnvironment env, DemoImageSeeder images, PatientPackageService packages)
    {
        _packages = packages;
        _db = db;
        _tenantProvider = tenantProvider;
        _env = env;
        _images = images;
    }

    // ── POST /api/v1/dev/seed-demo ──────────────────────────────────────
    // Idempotente: si ya existe el paciente con cédula 1000000001 no duplica
    // nada, pero sí vuelve a dejar la contraseña del SuperAdmin en el valor
    // de demo para garantizar el login.
    // ── POST /api/v1/dev/run-package-expiration ─────────────────────────
    // Ejecuta ahora el job diario de Hangfire (paquetes vencidos → Vencido) para probarlo sin esperar a las 02:00.
    [HttpPost("run-package-expiration")]
    public async Task<IActionResult> RunPackageExpiration()
    {
        if (!_env.IsDevelopment())
            return NotFound();
        return Ok(new { vencidos = await _packages.ExpireOverdueAsync() });
    }

    // ?reanchor=true → si los datos ya existían, desplaza TODAS las citas los días necesarios para
    // que la más antigua caiga ayer. Así la agenda demo vuelve a rodear "hoy" sin recrear nada
    // (el seed original fija las fechas al día en que se ejecutó).
    [HttpPost("seed-demo")]
    public async Task<IActionResult> SeedDemo([FromQuery] bool reanchor = false)
    {
        if (!_env.IsDevelopment())
            return NotFound();

        var tenant = await _db.Tenants
            .IgnoreQueryFilters()
            .OrderBy(t => t.CreatedAt)
            .FirstOrDefaultAsync();

        if (tenant is null)
            return BadRequest(new { error = "No existe tenant. Ejecuta POST /api/v1/auth/seed primero." });

        // A partir de aquí los filtros globales y el stamping de TenantId
        // apuntan al tenant de demo (mismo mecanismo que AuthController.Seed).
        _tenantProvider.SetTenant(tenant.Id);

        var superAdmin = await _db.Users
            .Where(u => u.Rol == UserRole.SuperAdmin)
            .OrderBy(u => u.CreatedAt)
            .FirstOrDefaultAsync();

        if (superAdmin is null)
            return BadRequest(new { error = "El tenant no tiene SuperAdmin." });

        var branch = await _db.Branches
            .OrderBy(b => b.CreatedAt)
            .FirstOrDefaultAsync();

        if (branch is null)
            return BadRequest(new { error = "El tenant no tiene sedes." });

        await using var tx = await _db.Database.BeginTransactionAsync();

        superAdmin.PasswordHash = BCrypt.Net.BCrypt.HashPassword(SuperAdminPassword);
        superAdmin.MustChangePassword = false; // cuenta demo con clave conocida

        var alreadySeeded = await _db.Patients.AnyAsync(p => p.Cedula == DemoCedulaMarker);
        if (alreadySeeded)
        {
            await BackfillPaymentTraceabilityAsync(superAdmin.Id);
            await BackfillEvolutionDetailAsync();
            await SeedValuationsAsync();
            await SeedCabinConsumptionAsync(superAdmin.Id);
            await _db.SaveChangesAsync();
            // Las imágenes de muestra tienen su propia idempotencia: una base sembrada antes
            // de que existieran los adjuntos las recibe en la siguiente ejecución.
            var imagenesNuevas = await _images.SeedAsync(superAdmin.Id);
            var diasDesplazados = reanchor ? await ReanchorAgendaAsync() : 0;
            await tx.CommitAsync();
            return Ok(new
            {
                message = "Datos demo ya existentes. Solo se reseteó la contraseña del SuperAdmin.",
                superAdminEmail = superAdmin.Email,
                created = false,
                imagenes = imagenesNuevas,
                diasDesplazados
            });
        }

        // ── Fechas: la API no maneja zona horaria y el frontend interpreta
        // las fechas devueltas como hora local, así que se guardan en hora
        // local de la máquina (Bogotá) para que la demo se vea coherente.
        var today = DateTime.Now.Date;
        var todayOnly = DateOnly.FromDateTime(today);
        DateTime At(int dayOffset, int hour, int minute = 0) =>
            DateTime.SpecifyKind(today.AddDays(dayOffset).AddHours(hour).AddMinutes(minute), DateTimeKind.Unspecified);

        // ── Esteticistas ────────────────────────────────────────────────
        var esteticistaHash = BCrypt.Net.BCrypt.HashPassword(EsteticistaPassword);
        var laura = new User
        {
            Nombre = "Laura", Apellido = "Pérez", Email = "laura.perez@nemedi.demo",
            PasswordHash = esteticistaHash, MustChangePassword = false, Rol = UserRole.Esteticista, BranchId = branch.Id
        };
        var camila = new User
        {
            Nombre = "Camila", Apellido = "Ruiz", Email = "camila.ruiz@nemedi.demo",
            PasswordHash = esteticistaHash, MustChangePassword = false, Rol = UserRole.Esteticista, BranchId = branch.Id
        };
        _db.Users.AddRange(laura, camila);

        // ── Procedimientos (precios COP) ────────────────────────────────
        var limpieza = Proc("Limpieza facial profunda", "Limpieza con extracción, exfoliación y mascarilla calmante.", 120_000m, 60, "Rostro");
        var laserPiernas = Proc("Depilación láser piernas completas", "Láser diodo en piernas completas. Requiere 4 a 6 sesiones.", 250_000m, 45, "Piernas");
        var radiofrecuencia = Proc("Radiofrecuencia facial", "Tensado y estimulación de colágeno con radiofrecuencia.", 180_000m, 45, "Rostro");
        var masaje = Proc("Masaje reductor", "Masaje manual reductor y drenaje en abdomen y cintura.", 90_000m, 60, "Abdomen");
        var peeling = Proc("Peeling químico", "Peeling con ácido glicólico al 30 % para renovación celular.", 200_000m, 30, "Rostro");
        var hidratacion = Proc("Hidratación profunda", "Hidratación con ácido hialurónico, vitaminas y máscara de colágeno.", 150_000m, 90, "Rostro");
        _db.Procedures.AddRange(limpieza, laserPiernas, radiofrecuencia, masaje, peeling, hidratacion);

        // ── Paquetes (precio menor a la suma de sesiones) ───────────────
        var rostroRadiante = new Package
        {
            Nombre = "Rostro Radiante",
            Descripcion = "2 limpiezas + 2 hidrataciones + 1 peeling. Suma individual: $740.000.",
            PrecioTotal = 620_000m, SesionesTotales = 5, VigenciaDias = 90, DiasAlertaVencimiento = 15
        };
        var cuerpoFirme = new Package
        {
            Nombre = "Cuerpo Firme",
            Descripcion = "6 masajes reductores + 2 radiofrecuencias. Suma individual: $900.000.",
            PrecioTotal = 750_000m, SesionesTotales = 8, VigenciaDias = 120, DiasAlertaVencimiento = 15
        };
        var piernasLaser = new Package
        {
            Nombre = "Piernas Láser",
            Descripcion = "4 sesiones de depilación láser piernas completas. Suma individual: $1.000.000.",
            PrecioTotal = 850_000m, SesionesTotales = 4, VigenciaDias = 180, DiasAlertaVencimiento = 30
        };
        _db.Packages.AddRange(rostroRadiante, cuerpoFirme, piernasLaser);
        _db.PackageProcedures.AddRange(
            new PackageProcedure { PackageId = rostroRadiante.Id, ProcedureId = limpieza.Id, CantidadSesiones = 2 },
            new PackageProcedure { PackageId = rostroRadiante.Id, ProcedureId = hidratacion.Id, CantidadSesiones = 2 },
            new PackageProcedure { PackageId = rostroRadiante.Id, ProcedureId = peeling.Id, CantidadSesiones = 1 },
            new PackageProcedure { PackageId = cuerpoFirme.Id, ProcedureId = masaje.Id, CantidadSesiones = 6 },
            new PackageProcedure { PackageId = cuerpoFirme.Id, ProcedureId = radiofrecuencia.Id, CantidadSesiones = 2 },
            new PackageProcedure { PackageId = piernasLaser.Id, ProcedureId = laserPiernas.Id, CantidadSesiones = 4 });

        // ── Pacientes + historia clínica ────────────────────────────────
        var p1 = Pat("Valentina", "Rodríguez", "1000000001", "3001234501", "valentina.rodriguez@example.com", new DateOnly(1994, 3, 12));
        var p2 = Pat("Mariana", "Gómez", "1000000002", "3001234502", "mariana.gomez@example.com", new DateOnly(1989, 7, 25));
        var p3 = Pat("Juliana", "Martínez", "1000000003", "3001234503", "juliana.martinez@example.com", new DateOnly(1997, 11, 3));
        var p4 = Pat("Andrés Felipe", "López", "1000000004", "3001234504", "andres.lopez@example.com", new DateOnly(1991, 1, 18));
        var p5 = Pat("Daniela", "Torres", "1000000005", "3001234505", "daniela.torres@example.com", new DateOnly(1999, 5, 30));
        var p6 = Pat("Sara", "Hernández", "1000000006", "3001234506", "sara.hernandez@example.com", new DateOnly(1985, 9, 9));
        var p7 = Pat("Carolina", "Ramírez", "1000000007", "3001234507", "carolina.ramirez@example.com", new DateOnly(1993, 12, 21));
        var p8 = Pat("Santiago", "Castro", "1000000008", "3001234508", "santiago.castro@example.com", new DateOnly(1988, 4, 6));
        var patients = new[] { p1, p2, p3, p4, p5, p6, p7, p8 };
        _db.Patients.AddRange(patients);

        var records = patients.ToDictionary(p => p.Id, p => new ClinicalRecord { PatientId = p.Id });
        records[p1.Id].AntecedentesMedicos = "Rosácea leve diagnosticada en 2022. Sin cirugías.";
        records[p1.Id].Alergias = "Alergia al níquel y a fragancias sintéticas.";
        records[p1.Id].MedicamentosActuales = "Ninguno.";
        records[p1.Id].ObservacionesGenerales = "Piel sensible: evitar ácidos de alta concentración.";
        records[p3.Id].AntecedentesMedicos = "Hipotiroidismo controlado. Cesárea en 2021.";
        records[p3.Id].Alergias = "Penicilina.";
        records[p3.Id].MedicamentosActuales = "Levotiroxina 50 mcg diaria.";
        records[p3.Id].ObservacionesGenerales = "Objetivo: reducción de medidas abdominales post parto.";
        records[p5.Id].AntecedentesMedicos = "Asma leve en la infancia, sin crisis recientes.";
        records[p5.Id].Alergias = "Látex.";
        records[p5.Id].ObservacionesGenerales = "Usar guantes de nitrilo en todos los procedimientos.";
        _db.ClinicalRecords.AddRange(records.Values);

        // ── Paquetes asignados + sesiones + pagos ───────────────────────
        // P1: Rostro Radiante, pago completo, 2 de 5 sesiones.
        var pp1 = Assign(p1, rostroRadiante, 620_000m, todayOnly.AddDays(-15), completed: 2, completedDays: new[] { -10, -1 });
        // P2: Piernas Láser, pago completo, 1 de 4 sesiones.
        var pp2 = Assign(p2, piernasLaser, 850_000m, todayOnly.AddDays(-20), completed: 1, completedDays: new[] { -14 });
        // P3: Cuerpo Firme, pago parcial, 3 de 8 sesiones.
        var pp3 = Assign(p3, cuerpoFirme, 750_000m, todayOnly.AddDays(-12), completed: 3, completedDays: new[] { -9, -5, -1 });
        // P4: Rostro Radiante, pago parcial, 1 de 5 sesiones.
        var pp4 = Assign(p4, rostroRadiante, 620_000m, todayOnly.AddDays(-8), completed: 1, completedDays: new[] { -7 });
        // P5: Piernas Láser, sin pagos, 0 de 4 sesiones.
        var pp5 = Assign(p5, piernasLaser, 850_000m, todayOnly.AddDays(-2), completed: 0, completedDays: Array.Empty<int>());

        _db.PatientPayments.AddRange(
            Pay(pp1, 320_000m, -12, PaymentMethod.Efectivo, "Abono inicial", superAdmin.Id),
            Pay(pp1, 300_000m, -5, PaymentMethod.Transferencia, "Saldo", superAdmin.Id),
            Pay(pp2, 850_000m, -14, PaymentMethod.Tarjeta, "Pago total", superAdmin.Id),
            Pay(pp3, 300_000m, -8, PaymentMethod.Efectivo, "Abono inicial", superAdmin.Id),
            Pay(pp4, 200_000m, -7, PaymentMethod.Transferencia, "Abono inicial", superAdmin.Id));

        // ── Citas: ayer a +5 días, sin choques por esteticista ──────────
        var appointments = new List<Appointment>
        {
            Appt(At(-1, 9), laura, p1, limpieza, AppointmentStatus.Completada, pp1.Sessions[1], "Segunda limpieza del paquete."),
            Appt(At(-1, 11), camila, p3, masaje, AppointmentStatus.Completada, pp3.Sessions[2], null),
            Appt(At(-1, 14), laura, p6, peeling, AppointmentStatus.Cancelada, null, "Canceló por viaje."),
            Appt(At(-1, 16), camila, p7, radiofrecuencia, AppointmentStatus.NoConfirmo, null, null),
            Appt(At(0, 8), laura, p8, hidratacion, AppointmentStatus.Completada, null, null),
            Appt(At(0, 10), laura, p2, laserPiernas, AppointmentStatus.Confirmada, pp2.Sessions[1], null),
            Appt(At(0, 11), camila, p4, limpieza, AppointmentStatus.Confirmada, null, null),
            Appt(At(0, 15), camila, p6, hidratacion, AppointmentStatus.Agendada, null, "Reprogramada tras cancelación."),
            Appt(At(1, 9), laura, p7, radiofrecuencia, AppointmentStatus.Confirmada, null, null),
            Appt(At(1, 10, 30), camila, p1, hidratacion, AppointmentStatus.Agendada, pp1.Sessions[2], null),
            Appt(At(2, 15), camila, p5, laserPiernas, AppointmentStatus.Agendada, pp5.Sessions[0], "Primera sesión del paquete."),
            Appt(At(4, 9), laura, p3, masaje, AppointmentStatus.Agendada, pp3.Sessions[3], null),
        };
        _db.Appointments.AddRange(appointments);

        // Notas de evolución para las dos citas completadas ligadas a sesión.
        // Una nota por sesión completada: así la pestaña Evolución muestra el tratamiento
        // agrupado por paquete y con progresión, no una sola sesión suelta.
        var note1a = Nota(records[p1.Id].Id, null, laura.Id, limpieza.Nombre, At(-10, 10),
            "Primera sesión del plan. Piel deshidratada, poros dilatados en zona T. Extracción completa sin incidentes.",
            zona: "Rostro completo", parametros: "Vapor 10 min · extracción manual · mascarilla calmante 15 min",
            indicaciones: "No exponerse al sol 48 h. Protector solar cada 3 horas. No maquillaje hasta mañana.",
            proxima: todayOnly.AddDays(-1), evaluacion: 4);
        var note1b = Nota(records[p1.Id].Id, appointments[0].Id, laura.Id, limpieza.Nombre, At(-1, 10),
            "Segunda sesión. Piel con leve enrojecimiento post extracción, tolerancia buena. Se nota mejoría en textura frente a la primera sesión.",
            zona: "Rostro completo", parametros: "Vapor 8 min · extracción suave · mascarilla de colágeno",
            indicaciones: "Mantener hidratación nocturna. Evitar exfoliantes esta semana.",
            proxima: todayOnly.AddDays(13), evaluacion: 5);

        var note3a = Nota(records[p3.Id].Id, null, camila.Id, masaje.Nombre, At(-9, 11),
            "Primera sesión. Medición inicial: cintura 82 cm, abdomen 91 cm. Tejido con retención marcada.",
            zona: "Abdomen y cintura", parametros: "Maniobras de drenaje 40 min · presión media",
            indicaciones: "Tomar 2 litros de agua al día. Evitar sal las próximas 48 h.",
            proxima: todayOnly.AddDays(-5), evaluacion: 3);
        var note3b = Nota(records[p3.Id].Id, null, camila.Id, masaje.Nombre, At(-5, 11),
            "Segunda sesión. Cintura 81 cm. Mejor respuesta del tejido, menos dolor durante las maniobras.",
            zona: "Abdomen y cintura", parametros: "Drenaje 45 min · presión media-alta",
            indicaciones: "Continuar con la hidratación. Caminar 30 min diarios.",
            proxima: todayOnly.AddDays(-1), evaluacion: 4);
        var note3c = Nota(records[p3.Id].Id, appointments[1].Id, camila.Id, masaje.Nombre, At(-1, 12),
            "Tercera sesión. Reducción de 1,5 cm en contorno de cintura respecto a la medición inicial.",
            zona: "Abdomen y cintura", parametros: "Drenaje 45 min · presión alta · terminación con maniobras de cierre",
            indicaciones: "Mantener rutina de caminata. Próxima medición en la sesión 5.",
            proxima: todayOnly.AddDays(6), evaluacion: 5);

        _db.ClinicalNotes.AddRange(note1a, note1b, note3a, note3b, note3c);
        pp1.Sessions[0].ClinicalNoteId = note1a.Id;
        pp1.Sessions[1].ClinicalNoteId = note1b.Id;
        pp3.Sessions[0].ClinicalNoteId = note3a.Id;
        pp3.Sessions[1].ClinicalNoteId = note3b.Id;
        pp3.Sessions[2].ClinicalNoteId = note3c.Id;

        // ── Consumo de cabina de las citas completadas del historial ────
        // Se siembra al final de SeedDemo, cuando ya existen productos, notas y citas.

        // ── Productos + entradas (semáforo: verde / amarillo / rojo) ────
        // Rojo: stock 0 o < 50 % del mínimo. Amarillo: < mínimo. Verde: >= mínimo.
        var products = new (Product Product, decimal Entrada)[]
        {
            (Prod("Crema hidratante facial 500 ml", "HID-500", ProductType.InsumoCabina, "unidad", min: 5, max: 30), 20m),      // verde
            (Prod("Gel conductor radiofrecuencia 1 L", "GEL-RF-1L", ProductType.InsumoCabina, "litro", min: 4, max: 20), 12m),   // verde
            (Prod("Ácido glicólico 30 % 250 ml", "AG30-250", ProductType.InsumoCabina, "unidad", min: 10, max: 40), 7m),        // amarillo
            (Prod("Aceite reductor 1 L", "ACR-1L", ProductType.Ambos, "litro", min: 6, max: 24), 4m),                            // amarillo
            (Prod("Mascarilla de colágeno", "MASC-COL", ProductType.Venta, "unidad", min: 20, max: 100), 5m),                    // rojo
            (Prod("Guantes de nitrilo (caja x100)", "GNT-100", ProductType.InsumoCabina, "caja", min: 10, max: 50), 3m),         // rojo
        };
        foreach (var (product, cantidad) in products)
        {
            _db.Products.Add(product);
            var fecha = At(-20, 10);
            var entry = new InventoryEntry
            {
                ProductId = product.Id, Cantidad = cantidad, MotivoEntrada = EntryReason.Compra,
                Observacion = DemoEntryMarker, UserId = superAdmin.Id, FechaEntrada = fecha
            };
            _db.InventoryEntries.Add(entry);
            product.StockActual = cantidad;
            _db.InventoryMovements.Add(new InventoryMovement
            {
                ProductId = product.Id, Cantidad = cantidad, TipoMovimiento = MovementType.Entrada,
                Referencia = DemoEntryMarker, UserId = superAdmin.Id, FechaMovimiento = fecha
            });
        }

        await _db.SaveChangesAsync();
        await SeedValuationsAsync(laura.Id, camila.Id);
        await SeedCabinConsumptionAsync(superAdmin.Id);
        await _images.SeedAsync(superAdmin.Id);
        await tx.CommitAsync();

        return Ok(new
        {
            message = "Datos demo creados.",
            created = true,
            superAdminEmail = superAdmin.Email,
            esteticistas = new[] { laura.Email, camila.Email },
            procedimientos = 6,
            paquetes = 3,
            pacientes = patients.Length,
            paquetesAsignados = 5,
            citas = appointments.Count,
            productos = products.Length
        });
    }

    // ── Helpers de construcción ─────────────────────────────────────────

    private const string HistoryMarker = "[demo] historial";

    /// <summary>
    /// Mueve todas las citas del tenant N días para que la más antigua de la agenda demo quede en
    /// "ayer", y rellena las dos semanas anteriores con citas completadas (una sola vez) para que
    /// las gráficas del Dashboard tengan historia.
    /// </summary>
    private async Task<int> ReanchorAgendaAsync()
    {
        // El historial no cuenta para anclar: si no, cada ejecución empujaría la agenda hacia atrás
        var oldest = await _db.Appointments
            .Where(a => a.Notas != HistoryMarker)
            .OrderBy(a => a.FechaInicio)
            .Select(a => (DateTime?)a.FechaInicio)
            .FirstOrDefaultAsync();
        if (oldest is null)
            return 0;

        var days = (DateTime.Now.Date.AddDays(-1) - oldest.Value.Date).Days;
        if (days != 0)
        {
            await _db.Appointments.ExecuteUpdateAsync(s => s
                .SetProperty(a => a.FechaInicio, a => a.FechaInicio.AddDays(days))
                .SetProperty(a => a.FechaFin, a => a.FechaFin.AddDays(days)));
        }

        await SeedHistoryAsync();
        await ReanchorInventoryAsync();
        return days;
    }

    /// <summary>
    /// La compra inicial del seed se fecha 20 días antes de sembrar, así que con el tiempo queda fuera
    /// del mes y el panel "Productos del mes" del Dashboard se vacía. Aquí se desplaza esa compra para
    /// que caiga 10 días atrás. No toca el stock (vive en Product) ni las entradas registradas por
    /// alguien más: solo las marcadas como demo, porque mover las demás las empujaría al futuro.
    /// </summary>
    private async Task ReanchorInventoryAsync()
    {
        var oldest = await _db.InventoryEntries
            .Where(e => e.Observacion == DemoEntryMarker)
            .OrderBy(e => e.FechaEntrada)
            .Select(e => (DateTime?)e.FechaEntrada)
            .FirstOrDefaultAsync();
        if (oldest is null)
            return;

        var days = (DateTime.Now.Date.AddDays(-10) - oldest.Value.Date).Days;
        if (days == 0)
            return;

        await _db.InventoryEntries
            .Where(e => e.Observacion == DemoEntryMarker)
            .ExecuteUpdateAsync(s => s.SetProperty(e => e.FechaEntrada, e => e.FechaEntrada.AddDays(days)));
        await _db.InventoryMovements
            .Where(m => m.Referencia == DemoEntryMarker)
            .ExecuteUpdateAsync(s => s.SetProperty(m => m.FechaMovimiento, m => m.FechaMovimiento.AddDays(days)));
    }

    private const string DemoEntryMarker = "Compra inicial (datos demo)";
    private const string DemoValuationPhone = "3164477120";
    private const string DemoConsumptionMarker = "Consumo de cabina (datos demo)";

    /// <summary>
    /// Consumo de cabina de muestra: cada nota clínica del seed gasta uno o dos insumos, con su
    /// salida de inventario. Idempotente por la referencia del movimiento. No descuenta stock: los
    /// productos demo se sembraron con la existencia que deben mostrar en el semáforo.
    /// </summary>
    private async Task SeedCabinConsumptionAsync(Guid userId)
    {
        if (await _db.InventoryMovements.AnyAsync(m => m.Referencia == DemoConsumptionMarker))
            return;

        var notas = await _db.ClinicalNotes
            .Where(n => n.AppointmentId != null)
            .OrderBy(n => n.FechaCreacion)
            .Select(n => new { n.Id, n.AppointmentId, PatientId = n.ClinicalRecord.PatientId, n.FechaCreacion })
            .ToListAsync();
        var insumos = await _db.Products
            .Where(p => p.Activo && p.TipoProducto != ProductType.Venta)
            .OrderBy(p => p.Nombre)
            .ToListAsync();
        if (notas.Count == 0 || insumos.Count == 0)
            return;

        var n = 0;
        foreach (var nota in notas)
        {
            // Una o dos líneas por sesión, rotando entre los insumos
            var cuantos = 1 + n % 2;
            for (var i = 0; i < cuantos; i++, n++)
            {
                var producto = insumos[n % insumos.Count];
                var cantidad = 1 + n % 2;
                _db.ClinicalNoteProducts.Add(new ClinicalNoteProduct
                {
                    ClinicalNoteId = nota.Id, ProductId = producto.Id, Cantidad = cantidad
                });
                _db.InventoryMovements.Add(new InventoryMovement
                {
                    ProductId = producto.Id, Cantidad = cantidad, TipoMovimiento = MovementType.Salida,
                    Referencia = DemoConsumptionMarker, AppointmentId = nota.AppointmentId,
                    PatientId = nota.PatientId, UserId = userId, FechaMovimiento = nota.FechaCreacion
                });
            }
        }
    }

    private static readonly string[] DemoProcedureNames =
    [
        "Limpieza facial profunda", "Depilación láser piernas completas", "Radiofrecuencia facial",
        "Masaje reductor", "Peeling químico", "Hidratación profunda"
    ];

    private async Task SeedHistoryAsync()
    {
        if (await _db.Appointments.AnyAsync(a => a.Notas == HistoryMarker))
            return;

        var patients = await _db.Patients.Where(p => p.Cedula.StartsWith("100000000")).OrderBy(p => p.Cedula).ToListAsync();
        // Solo los procedimientos del seed: un procedimiento de prueba creado a mano no debe recibir historial demo
        var procedures = await _db.Procedures.Where(p => p.Activo && DemoProcedureNames.Contains(p.Nombre)).OrderBy(p => p.Nombre).ToListAsync();
        var esteticistas = await _db.Users.Where(u => u.Rol == UserRole.Esteticista && u.IsActive).OrderBy(u => u.Email).ToListAsync();
        var branch = await _db.Branches.OrderBy(b => b.CreatedAt).FirstOrDefaultAsync();
        if (patients.Count == 0 || procedures.Count == 0 || esteticistas.Count == 0 || branch is null)
            return;

        var today = DateTime.Now.Date;
        int[] hours = [9, 11, 14, 16];
        var n = 0;
        for (var offset = -15; offset <= -2; offset++)
        {
            var day = today.AddDays(offset);
            if (day.DayOfWeek == DayOfWeek.Sunday) continue;
            // Entre 1 y 4 citas por día, con una forma creíble (más carga a mitad de semana)
            var count = 1 + (Math.Abs(offset) * 7 + (int)day.DayOfWeek) % 4;
            for (var i = 0; i < count; i++, n++)
            {
                var procedure = procedures[n % procedures.Count];
                var start = DateTime.SpecifyKind(day.AddHours(hours[i]), DateTimeKind.Unspecified);
                _db.Appointments.Add(new Appointment
                {
                    PatientId = patients[n % patients.Count].Id,
                    EsteticistId = esteticistas[(n + i) % esteticistas.Count].Id,
                    ProcedureId = procedure.Id,
                    BranchId = branch.Id,
                    FechaInicio = start,
                    FechaFin = start.AddMinutes(procedure.DuracionMinutos),
                    Estado = n % 9 == 8 ? AppointmentStatus.Cancelada : AppointmentStatus.Completada,
                    Notas = HistoryMarker
                });
            }
        }
        await _db.SaveChangesAsync();
    }

    private static Procedure Proc(string nombre, string descripcion, decimal precio, int minutos, string area) => new()
    {
        Nombre = nombre, Descripcion = descripcion, PrecioBase = precio, DuracionMinutos = minutos, AreaCorporal = area, Activo = true
    };

    private static Patient Pat(string nombre, string apellido, string cedula, string telefono, string email, DateOnly nacimiento) => new()
    {
        Nombre = nombre, Apellido = apellido, Cedula = cedula, Telefono = telefono, Email = email, FechaNacimiento = nacimiento, IsActive = true
    };

    private static Product Prod(string nombre, string referencia, ProductType tipo, string unidad, decimal min, decimal max) => new()
    {
        Nombre = nombre, Descripcion = nombre, Referencia = referencia, TipoProducto = tipo, UnidadMedida = unidad,
        StockActual = 0m, StockMinimo = min, StockMaximo = max, Activo = true
    };

    private sealed class AssignedPackage
    {
        public required PatientPackage PatientPackage { get; init; }
        public required List<PatientPackageSession> Sessions { get; init; }
        public Guid Id => PatientPackage.Id;
    }

    /// <summary>Replica la generación de sesiones de PatientPackagesController.AssignPackage.</summary>
    private AssignedPackage Assign(Patient patient, Package package, decimal precio, DateOnly inicio, int completed, int[] completedDays)
    {
        var pp = new PatientPackage
        {
            PatientId = patient.Id, PackageId = package.Id, PrecioAcordado = precio, FechaInicio = inicio,
            Estado = PackageStatus.Activo, SesionesCompletadas = completed,
            // Copia del catálogo, igual que PatientPackageService.AssignAsync
            PackageNombre = package.Nombre, SesionesTotales = package.SesionesTotales,
            VigenciaDias = package.VigenciaDias, DiasAlertaVencimiento = package.DiasAlertaVencimiento
        };
        _db.PatientPackages.Add(pp);

        var sessions = new List<PatientPackageSession>();
        var numero = 1;
        foreach (var pkgProc in _db.PackageProcedures.Local.Where(x => x.PackageId == package.Id))
        {
            for (var i = 0; i < pkgProc.CantidadSesiones; i++)
            {
                sessions.Add(new PatientPackageSession
                {
                    PatientPackageId = pp.Id, ProcedureId = pkgProc.ProcedureId, Numero = numero++, Estado = SessionStatus.Pendiente
                });
            }
        }

        for (var i = 0; i < completed && i < sessions.Count; i++)
        {
            sessions[i].Estado = SessionStatus.Completada;
            sessions[i].FechaCompletada = DateTime.Now.Date.AddDays(completedDays[i]).AddHours(10);
        }

        _db.PatientPackageSessions.AddRange(sessions);
        return new AssignedPackage { PatientPackage = pp, Sessions = sessions };
    }

    // Ningún pago demo supera el precio acordado de su paquete (la API lo rechazaría con 422).
    /// <summary>
    /// Una base sembrada antes del detalle de sesión: las notas demo reciben zona, parámetros,
    /// indicaciones y evaluación, y cada sesión de paquete ya completada que no tenga nota recibe
    /// una, para que la pestaña Evolución muestre el tratamiento agrupado y con progresión.
    /// Idempotente: si alguna nota ya tiene ZonaTratada, no hace nada.
    /// </summary>
    private async Task BackfillEvolutionDetailAsync()
    {
        if (await _db.ClinicalNotes.AnyAsync(n => n.ZonaTratada != null))
            return;

        var hoy = DateOnly.FromDateTime(DateTime.Now);

        // 1. Detalle para las notas que ya existen
        foreach (var nota in await _db.ClinicalNotes.ToListAsync())
        {
            nota.ZonaTratada ??= "Rostro completo";
            nota.Parametros ??= "Según protocolo del procedimiento";
            nota.IndicacionesPost ??= "Protector solar y buena hidratación. Consultar ante cualquier molestia.";
            nota.ProximaSesionSugerida ??= hoy.AddDays(14);
            nota.EvaluacionPaciente ??= 4;
        }

        // 2. Una nota por sesión completada que aún no tenga una
        var sesiones = await _db.PatientPackageSessions
            .Where(s => s.Estado == SessionStatus.Completada && s.ClinicalNoteId == null)
            .Select(s => new
            {
                s.Id,
                s.Numero,
                s.FechaCompletada,
                Procedimiento = s.Procedure.Nombre,
                s.PatientPackage.PatientId,
                Paquete = s.PatientPackage.PackageNombre
            })
            .ToListAsync();
        if (sesiones.Count == 0)
            return;

        var patientIds = sesiones.Select(s => s.PatientId).Distinct().ToList();
        var records = await _db.ClinicalRecords
            .Where(r => patientIds.Contains(r.PatientId))
            .ToDictionaryAsync(r => r.PatientId, r => r.Id);
        var esteticistas = await _db.Users
            .Where(u => u.Rol == UserRole.Esteticista && u.IsActive)
            .OrderBy(u => u.Email)
            .ToListAsync();
        if (esteticistas.Count == 0)
            return;

        // El Id de BaseEntity se genera en cliente, así que la sesión se puede enlazar en el acto
        var n = 0;
        foreach (var sesion in sesiones)
        {
            if (!records.TryGetValue(sesion.PatientId, out var recordId)) continue;
            var fecha = sesion.FechaCompletada ?? DateTime.Now.AddDays(-sesion.Numero);
            var nota = new ClinicalNote
            {
                ClinicalRecordId = recordId,
                EsteticistId = esteticistas[n++ % esteticistas.Count].Id,
                Procedimiento = sesion.Procedimiento,
                Observaciones = $"Sesión {sesion.Numero} de {sesion.Paquete}. Evolución dentro de lo esperado, buena tolerancia al procedimiento.",
                ZonaTratada = "Según el procedimiento",
                Parametros = "Según protocolo",
                IndicacionesPost = "Hidratación y protector solar. Evitar exposición directa 48 h.",
                ProximaSesionSugerida = DateOnly.FromDateTime(fecha).AddDays(14),
                EvaluacionPaciente = 4 + (sesion.Numero % 2),
                FechaCreacion = fecha
            };
            _db.ClinicalNotes.Add(nota);
            var entidad = await _db.PatientPackageSessions.FirstAsync(s => s.Id == sesion.Id);
            entidad.ClinicalNoteId = nota.Id;
        }
    }

    /// <summary>
    /// Ocho valoraciones del mes en curso: 3 aceptadas (dos de pacientes con su paquete ya asignado,
    /// una de un prospecto convertido), 3 pendientes de prospectos sin cédula y 2 rechazadas con su
    /// motivo. Sirven para que el embudo y la tasa de conversión de /valoraciones muestren algo real
    /// (3 de 8 = 37,5 %). Idempotente por el marcador en el diagnóstico.
    ///
    /// Las fechas se reparten en el mes en curso, así que no necesitan re-anclaje: siempre caen
    /// dentro del periodo que mira la pantalla.
    /// </summary>
    private async Task SeedValuationsAsync(Guid? lauraId = null, Guid? camilaId = null)
    {
        if (await _db.Valuations.AnyAsync(v => v.ProspectoTelefono == DemoValuationPhone))
            return;

        var esteticistas = lauraId.HasValue && camilaId.HasValue
            ? new[] { lauraId.Value, camilaId.Value }
            : (await _db.Users.Where(u => u.Rol == UserRole.Esteticista && u.IsActive).OrderBy(u => u.Email).Select(u => u.Id).ToListAsync()).ToArray();
        if (esteticistas.Length == 0)
            return;

        var hoy = DateTime.Now.Date;
        var primero = new DateTime(hoy.Year, hoy.Month, 1);
        // Un día dentro del mes en curso, sin pasarse de hoy
        DateTime Dia(int dia) => DateTime.SpecifyKind(
            primero.AddDays(Math.Min(dia, hoy.Day) - 1).AddHours(9 + dia % 6), DateTimeKind.Unspecified);

        var pacientes = await _db.Patients.Where(p => p.Cedula.StartsWith("100000000")).OrderBy(p => p.Cedula).ToListAsync();
        var paquetes = await _db.Packages.OrderBy(p => p.Nombre).ToListAsync();
        var asignaciones = await _db.PatientPackages.OrderBy(pp => pp.FechaInicio).ToListAsync();

        Valuation V(int i, string diagnostico, string tratamiento, decimal precio, ValuationEstado estado, int dia,
            Patient? paciente = null, string? prospectoNombre = null, string? prospectoTelefono = null,
            Package? paquete = null, string? motivo = null, Guid? patientPackageId = null) => new()
        {
            PatientId = paciente?.Id,
            ProspectoNombre = prospectoNombre,
            ProspectoTelefono = prospectoTelefono,
            EsteticistId = esteticistas[i % esteticistas.Length],
            Fecha = Dia(dia),
            Diagnostico = diagnostico,
            TratamientoSugerido = tratamiento,
            PackageId = paquete?.Id,
            PrecioCotizado = precio,
            Estado = estado,
            MotivoRechazo = motivo,
            FechaCierre = estado == ValuationEstado.Pendiente ? null : Dia(Math.Min(dia + 2, 28)),
            PatientPackageId = patientPackageId
        };

        var rostroRadiante = paquetes.FirstOrDefault(p => p.Nombre.Contains("Rostro"));
        var piernasLaser = paquetes.FirstOrDefault(p => p.Nombre.Contains("Piernas"));
        var cuerpoFirme = paquetes.FirstOrDefault(p => p.Nombre.Contains("Cuerpo"));

        var valoraciones = new List<Valuation>();

        // ── 3 aceptadas ──
        if (pacientes.Count > 1)
        {
            valoraciones.Add(V(0, "Melasma leve en pómulos y frente, fototipo III. Piel con deshidratación marcada.",
                "Protocolo despigmentante: 5 sesiones de limpieza profunda + peeling de mantenimiento.",
                620_000m, ValuationEstado.Acepto, 3, paciente: pacientes[0], paquete: rostroRadiante,
                patientPackageId: asignaciones.FirstOrDefault(a => a.PatientId == pacientes[0].Id)?.Id));

            valoraciones.Add(V(1, "Vello grueso en piernas completas, fototipo IV. Sin contraindicaciones para láser.",
                "Depilación láser diodo, 4 sesiones cada 6 semanas.",
                850_000m, ValuationEstado.Acepto, 6, paciente: pacientes[1], paquete: piernasLaser,
                patientPackageId: asignaciones.FirstOrDefault(a => a.PatientId == pacientes[1].Id)?.Id));
        }

        // Prospecto que se convirtió en paciente (el tercero aceptado)
        var convertida = await _db.Patients.FirstOrDefaultAsync(p => p.Cedula == "1098765432");
        if (convertida is null)
        {
            convertida = new Patient
            {
                Nombre = "Mónica", Apellido = "Salazar", Cedula = "1098765432", Telefono = "3123456789",
                Email = "monica.salazar@example.com", FechaNacimiento = new DateOnly(1988, 4, 22),
                NotasGenerales = "Llegó por valoración de contorno corporal."
            };
            _db.Patients.Add(convertida);
            _db.ClinicalRecords.Add(new ClinicalRecord { PatientId = convertida.Id });
        }
        // La conversión le dejó su paquete asignado, como haría "Convertir" en la pantalla
        Guid? paqueteConvertida = null;
        if (cuerpoFirme is not null)
        {
            var asignada = await _packages.AssignAsync(convertida.Id, cuerpoFirme.Id, 1_450_000m,
                DateOnly.FromDateTime(Dia(9)), patientIsNew: true);
            paqueteConvertida = asignada.Id;
        }
        valoraciones.Add(V(0, "Flacidez abdominal posparto y acumulación localizada en cintura.",
            "Plan corporal: 8 sesiones de masaje reductor con radiofrecuencia de cierre.",
            1_450_000m, ValuationEstado.Acepto, 9, paciente: convertida, paquete: cuerpoFirme,
            patientPackageId: paqueteConvertida));

        // ── 3 pendientes: prospectos sin cédula ──
        valoraciones.Add(V(1, "Arrugas de expresión en zona periocular. Consulta por rejuvenecimiento sin cirugía.",
            "Radiofrecuencia facial, 6 sesiones quincenales.", 980_000m, ValuationEstado.Pendiente, 12,
            prospectoNombre: "Paula Andrea Gil", prospectoTelefono: "3164477120"));
        valoraciones.Add(V(0, "Acné activo grado II en mentón y espalda. Piel mixta con poros dilatados.",
            "Limpiezas profundas quincenales + peeling salicílico. Se cotiza plan de 6 sesiones.",
            720_000m, ValuationEstado.Pendiente, 15,
            prospectoNombre: "Daniela Ochoa", prospectoTelefono: "3001129384"));
        valoraciones.Add(V(1, "Consulta por remodelación corporal completa: abdomen, flancos y glúteos.",
            "Plan integral de 12 sesiones combinando masaje reductor y radiofrecuencia.",
            2_450_000m, ValuationEstado.Pendiente, 18,
            prospectoNombre: "Carolina Mejía", prospectoTelefono: "3209988771"));

        // ── 2 rechazadas ──
        valoraciones.Add(V(0, "Manchas solares en dorso de manos y escote.",
            "Peeling químico despigmentante, 4 sesiones.", 800_000m, ValuationEstado.Rechazo, 8,
            prospectoNombre: "Luz Marina Cifuentes", prospectoTelefono: "3112233445",
            motivo: "El precio se sale de su presupuesto este semestre."));
        valoraciones.Add(V(1, "Celulitis grado II en muslos posteriores.",
            "Masaje reductor con drenaje, 10 sesiones.", 1_200_000m, ValuationEstado.Rechazo, 14,
            prospectoNombre: "Sandra Patricia Rojas", prospectoTelefono: "3145566778",
            motivo: "Lo va a pensar y vuelve después de vacaciones."));

        _db.Valuations.AddRange(valoraciones);
        await _db.SaveChangesAsync();

        // Foto "Antes" en una de las pendientes, para que se vea el adjunto de la valoración
        var conFoto = valoraciones.First(v => v.Estado == ValuationEstado.Pendiente);
        await _images.SeedValuationPhotoAsync(conFoto.Id, esteticistas[0]);
        await _db.SaveChangesAsync();
    }

    private static ClinicalNote Nota(
        Guid recordId, Guid? appointmentId, Guid esteticistId, string procedimiento, DateTime fecha,
        string observaciones, string zona, string parametros, string indicaciones, DateOnly proxima, int evaluacion) => new()
    {
        ClinicalRecordId = recordId, AppointmentId = appointmentId, EsteticistId = esteticistId,
        Procedimiento = procedimiento, Observaciones = observaciones, FechaCreacion = fecha,
        ZonaTratada = zona, Parametros = parametros, IndicacionesPost = indicaciones,
        ProximaSesionSugerida = proxima, EvaluacionPaciente = evaluacion
    };

    private static PatientPayment Pay(AssignedPackage pp, decimal monto, int dayOffset, PaymentMethod metodo, string? obs, Guid registradoPor)
    {
        var payment = new PatientPayment
        {
            PatientPackageId = pp.Id, Monto = monto, FechaPago = DateOnly.FromDateTime(DateTime.Now.Date.AddDays(dayOffset)),
            MetodoPago = metodo, Observacion = obs, RegistradoPorId = registradoPor
        };
        payment.Referencia = DemoReferencia(payment);
        return payment;
    }

    private static string? DemoReferencia(PatientPayment payment) => payment.MetodoPago switch
    {
        PaymentMethod.Transferencia => $"TRF-{payment.Id.ToString()[..8].ToUpperInvariant()}",
        PaymentMethod.Tarjeta => $"Voucher {payment.Id.ToString()[..6].ToUpperInvariant()}",
        _ => null
    };

    /// <summary>Una base sembrada antes de la trazabilidad de pagos: los pagos demo reciben quién los registró y su referencia.</summary>
    private async Task BackfillPaymentTraceabilityAsync(Guid superAdminId)
    {
        var pagos = await _db.PatientPayments.Where(p => p.RegistradoPorId == null).ToListAsync();
        foreach (var pago in pagos)
        {
            pago.RegistradoPorId = superAdminId;
            pago.Referencia ??= DemoReferencia(pago);
        }
    }

    private Appointment Appt(DateTime inicio, User esteticista, Patient patient, Procedure procedure, AppointmentStatus estado,
        PatientPackageSession? session, string? notas)
    {
        var branchId = esteticista.BranchId ?? _db.Branches.Local.First().Id;
        return new Appointment
        {
            PatientId = patient.Id, EsteticistId = esteticista.Id, ProcedureId = procedure.Id, BranchId = branchId,
            PatientPackageSessionId = session?.Id, FechaInicio = inicio, FechaFin = inicio.AddMinutes(procedure.DuracionMinutos),
            Estado = estado, Notas = notas,
            WhatsAppReminderSent = estado is AppointmentStatus.Confirmada or AppointmentStatus.Completada or AppointmentStatus.NoConfirmo,
            WhatsAppConfirmedAt = estado is AppointmentStatus.Confirmada or AppointmentStatus.Completada ? inicio.AddDays(-1) : null
        };
    }
}
