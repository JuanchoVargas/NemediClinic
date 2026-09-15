using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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

    public DevController(AppDbContext db, ITenantProvider tenantProvider, IWebHostEnvironment env)
    {
        _db = db;
        _tenantProvider = tenantProvider;
        _env = env;
    }

    // ── POST /api/v1/dev/seed-demo ──────────────────────────────────────
    // Idempotente: si ya existe el paciente con cédula 1000000001 no duplica
    // nada, pero sí vuelve a dejar la contraseña del SuperAdmin en el valor
    // de demo para garantizar el login.
    [HttpPost("seed-demo")]
    public async Task<IActionResult> SeedDemo()
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

        var alreadySeeded = await _db.Patients.AnyAsync(p => p.Cedula == DemoCedulaMarker);
        if (alreadySeeded)
        {
            await _db.SaveChangesAsync();
            await tx.CommitAsync();
            return Ok(new
            {
                message = "Datos demo ya existentes. Solo se reseteó la contraseña del SuperAdmin.",
                superAdminEmail = superAdmin.Email,
                created = false
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
            PasswordHash = esteticistaHash, Rol = UserRole.Esteticista, BranchId = branch.Id
        };
        var camila = new User
        {
            Nombre = "Camila", Apellido = "Ruiz", Email = "camila.ruiz@nemedi.demo",
            PasswordHash = esteticistaHash, Rol = UserRole.Esteticista, BranchId = branch.Id
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
            Pay(pp1, 320_000m, -12, PaymentMethod.Efectivo, "Abono inicial"),
            Pay(pp1, 300_000m, -5, PaymentMethod.Transferencia, "Saldo"),
            Pay(pp2, 850_000m, -14, PaymentMethod.Tarjeta, "Pago total"),
            Pay(pp3, 300_000m, -8, PaymentMethod.Efectivo, "Abono inicial"),
            Pay(pp4, 200_000m, -7, PaymentMethod.Transferencia, "Abono inicial"));

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
        var note1 = new ClinicalNote
        {
            ClinicalRecordId = records[p1.Id].Id, AppointmentId = appointments[0].Id, EsteticistId = laura.Id,
            Procedimiento = limpieza.Nombre,
            Observaciones = "Piel con leve enrojecimiento post extracción, tolerancia buena. Se aplicó mascarilla calmante.",
            ProductosUsados = "Crema hidratante facial, Mascarilla de colágeno",
            FechaCreacion = At(-1, 10)
        };
        var note2 = new ClinicalNote
        {
            ClinicalRecordId = records[p3.Id].Id, AppointmentId = appointments[1].Id, EsteticistId = camila.Id,
            Procedimiento = masaje.Nombre,
            Observaciones = "Tercera sesión. Reducción de 1,5 cm en contorno de cintura respecto a la medición inicial.",
            ProductosUsados = "Aceite reductor",
            FechaCreacion = At(-1, 12)
        };
        _db.ClinicalNotes.AddRange(note1, note2);
        pp1.Sessions[1].ClinicalNoteId = note1.Id;
        pp3.Sessions[2].ClinicalNoteId = note2.Id;

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
                Observacion = "Compra inicial (datos demo)", UserId = superAdmin.Id, FechaEntrada = fecha
            };
            _db.InventoryEntries.Add(entry);
            product.StockActual = cantidad;
            _db.InventoryMovements.Add(new InventoryMovement
            {
                ProductId = product.Id, Cantidad = cantidad, TipoMovimiento = MovementType.Entrada,
                Referencia = $"Entrada manual #{entry.Id.ToString()[..8]}", UserId = superAdmin.Id, FechaMovimiento = fecha
            });
        }

        await _db.SaveChangesAsync();
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
            Estado = PackageStatus.Activo, SesionesCompletadas = completed
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

    private static PatientPayment Pay(AssignedPackage pp, decimal monto, int dayOffset, PaymentMethod metodo, string? obs) => new()
    {
        PatientPackageId = pp.Id, Monto = monto, FechaPago = DateOnly.FromDateTime(DateTime.Now.Date.AddDays(dayOffset)),
        MetodoPago = metodo, Observacion = obs
    };

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
