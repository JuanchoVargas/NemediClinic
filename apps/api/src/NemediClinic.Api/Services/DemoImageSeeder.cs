using System.Globalization;
using System.Security;
using Microsoft.EntityFrameworkCore;
using NemediClinic.Domain.Entities;
using NemediClinic.Domain.Enums;
using NemediClinic.Infrastructure.Persistence;

namespace NemediClinic.Api.Services;

/// <summary>
/// Imágenes de muestra del seed demo (solo Development). Son SVG generados aquí mismo —gradientes,
/// formas abstractas y una etiqueta—; NUNCA fotos de personas reales. Idempotente: los adjuntos
/// demo se reconocen por el prefijo "demo-" en FileName.
///   · 3 pacientes × 2 sesiones (nota clínica) con foto Antes y Después
///   · productos y procedimientos sin imagen → una imagen cada uno
/// </summary>
public class DemoImageSeeder
{
    private const string Prefix = "demo-";
    private static readonly string[] PatientCedulas = ["1000000001", "1000000002", "1000000003"];

    /// <summary>
    /// Un plan por paciente, en el mismo orden que PatientCedulas. El procedimiento es el del
    /// paquete que ese paciente tiene asignado: así la nota con fotos calza con una sesión del
    /// paquete y la pestaña Evolución la muestra DENTRO del tratamiento, no en "Sesiones sueltas".
    /// </summary>
    private static readonly (string Procedimiento, string Nota1, string Nota2, string Productos, string From, string To)[] Plans =
    [
        // Valentina · Rostro Radiante
        ("Limpieza facial profunda",
            "Piel mixta con poros dilatados en zona T. Se realiza extracción y mascarilla calmante. Tolerancia buena.",
            "Poros visiblemente más cerrados y tono más uniforme. Se refuerza rutina de hidratación en casa.",
            "Gel limpiador, mascarilla de arcilla, sérum calmante", "#E8B4A0", "#F6D9C8"),
        // Mariana · Piernas Láser
        ("Depilación láser piernas completas",
            "Vello grueso en piernas completas, fototipo IV. Primera sesión con parámetros conservadores.",
            "Reducción visible de densidad y grosor del vello. Sin reacciones adversas entre sesiones.",
            "Gel conductor, gel frío post láser", "#D9A441", "#F3DFB0"),
        // Juliana · Cuerpo Firme
        ("Masaje reductor",
            "Retención marcada en abdomen y flancos. Primera sesión de drenaje con presión media.",
            "Mejor respuesta del tejido y contorno más definido. Se mantiene la frecuencia semanal.",
            "Aceite reductor, crema de contraste", "#8FA8C8", "#DCE6F2"),
    ];

    private readonly AppDbContext _db;
    private readonly AttachmentService _attachments;

    public DemoImageSeeder(AppDbContext db, AttachmentService attachments)
    {
        _db = db;
        _attachments = attachments;
    }

    /// <summary>Requiere que el caller ya haya fijado el tenant (SetTenant). Devuelve cuántas imágenes creó.</summary>
    public async Task<int> SeedAsync(Guid fallbackUserId, CancellationToken ct = default)
    {
        var created = 0;
        var esteticistas = await _db.Users
            .Where(u => u.Rol == UserRole.Esteticista && u.IsActive)
            .OrderBy(u => u.Email)
            .Select(u => u.Id)
            .ToListAsync(ct);

        // ── Evolución: 3 pacientes × 2 sesiones ──
        var alreadyHasSessions = await _db.Attachments
            .AnyAsync(a => a.EntityType == AttachmentEntityType.ClinicalNote && a.FileName.StartsWith(Prefix), ct);

        if (!alreadyHasSessions)
        {
            var today = DateTime.Now.Date;
            for (var i = 0; i < PatientCedulas.Length; i++)
            {
                var cedula = PatientCedulas[i];
                var record = await _db.ClinicalRecords.FirstOrDefaultAsync(r => r.Patient.Cedula == cedula, ct);
                if (record is null) continue;

                var plan = Plans[i];
                var esteticista = esteticistas.Count > 0 ? esteticistas[i % esteticistas.Count] : fallbackUserId;
                var sesiones = new[] { (Dias: -28 - i, Texto: plan.Nota1), (Dias: -7 - i, Texto: plan.Nota2) };

                for (var s = 0; s < sesiones.Length; s++)
                {
                    var note = new ClinicalNote
                    {
                        ClinicalRecordId = record.Id,
                        EsteticistId = esteticista,
                        Procedimiento = plan.Procedimiento,
                        Observaciones = sesiones[s].Texto,
                        ProductosUsados = plan.Productos,
                        FechaCreacion = DateTime.SpecifyKind(today.AddDays(sesiones[s].Dias).AddHours(10 + i), DateTimeKind.Unspecified)
                    };
                    _db.ClinicalNotes.Add(note);

                    var titulo = $"Sesión {s + 1} · {plan.Procedimiento}";
                    // "Después" de la sesión 2 es la más lisa; "Antes" de la sesión 1, la más marcada.
                    await _attachments.SaveGeneratedSvgAsync(
                        SkinSvg("ANTES", titulo, plan.From, plan.To, texture: s == 0 ? 1.0 : 0.55),
                        $"{Prefix}antes-{cedula}-s{s + 1}.svg", AttachmentEntityType.ClinicalNote, note.Id, AttachmentKind.Antes, esteticista, ct);
                    await _attachments.SaveGeneratedSvgAsync(
                        SkinSvg("DESPUÉS", titulo, plan.From, plan.To, texture: s == 0 ? 0.55 : 0.15),
                        $"{Prefix}despues-{cedula}-s{s + 1}.svg", AttachmentEntityType.ClinicalNote, note.Id, AttachmentKind.Despues, esteticista, ct);
                    created += 2;
                }
            }
        }

        // ── Productos ──
        var palettes = new[] { ("#1F4E79", "#6FA3D0"), ("#D9A441", "#F3DFB0"), ("#5B8C7B", "#BFE0D2"), ("#9C6B8E", "#E6CFE0"), ("#C9705B", "#F2C9BD"), ("#4A5D73", "#C4D0DC") };
        var products = await _db.Products.Where(p => p.ImagenId == null).OrderBy(p => p.Nombre).ToListAsync(ct);
        for (var i = 0; i < products.Count; i++)
        {
            var (from, to) = palettes[i % palettes.Length];
            var attachment = await _attachments.SaveGeneratedSvgAsync(
                ProductSvg(products[i].Nombre, products[i].UnidadMedida, from, to, variant: i),
                $"{Prefix}producto-{i + 1}.svg", AttachmentEntityType.Product, products[i].Id, AttachmentKind.Producto, fallbackUserId, ct);
            products[i].ImagenId = attachment.Id;
            created++;
        }

        // ── Procedimientos ──
        var procedures = await _db.Procedures.Where(p => p.ImagenId == null).OrderBy(p => p.Nombre).ToListAsync(ct);
        for (var i = 0; i < procedures.Count; i++)
        {
            var (from, to) = palettes[(i + 2) % palettes.Length];
            var attachment = await _attachments.SaveGeneratedSvgAsync(
                ProcedureSvg(procedures[i].Nombre, procedures[i].AreaCorporal, from, to, variant: i),
                $"{Prefix}procedimiento-{i + 1}.svg", AttachmentEntityType.Procedure, procedures[i].Id, AttachmentKind.Procedimiento, fallbackUserId, ct);
            procedures[i].ImagenId = attachment.Id;
            created++;
        }

        if (created > 0)
            await _db.SaveChangesAsync(ct);
        return created;
    }

    // ── Generadores SVG ─────────────────────────────────────────────
    private static string F(double v) => v.ToString("0.##", CultureInfo.InvariantCulture);
    private static string Esc(string s) => SecurityElement.Escape(s) ?? string.Empty;

    /// <summary>Textura abstracta tipo "piel": fondo cálido + manchas. texture 1 = marcada, 0 = lisa.</summary>
    /// <summary>Foto "Antes" de una valoración. Idempotente por el nombre del archivo.</summary>
    public async Task SeedValuationPhotoAsync(Guid valuationId, Guid userId, CancellationToken ct = default)
    {
        var fileName = $"{Prefix}valoracion-{valuationId.ToString()[..8]}.svg";
        if (await _db.Attachments.AnyAsync(a => a.FileName == fileName, ct))
            return;

        await _attachments.SaveGeneratedSvgAsync(
            SkinSvg("ANTES", "Valoración inicial", "#e8c5b5", "#f6ded2", texture: 1.0),
            fileName, AttachmentEntityType.Valuation, valuationId, AttachmentKind.Antes, userId, ct);
    }

    private static string SkinSvg(string etiqueta, string titulo, string from, string to, double texture)
    {
        var rnd = new Random(HashCode.Combine(titulo.Length, etiqueta.Length, (int)(texture * 100)));
        var spots = new System.Text.StringBuilder();
        var count = (int)(70 * texture) + 6;
        for (var i = 0; i < count; i++)
        {
            var cx = rnd.Next(60, 740);
            var cy = rnd.Next(140, 860);
            var r = 4 + rnd.NextDouble() * 16 * (0.4 + texture);
            var opacity = 0.05 + rnd.NextDouble() * 0.22 * texture;
            spots.Append($"<circle cx=\"{cx}\" cy=\"{cy}\" r=\"{F(r)}\" fill=\"#8C4A3A\" opacity=\"{F(opacity)}\"/>");
        }

        return $"""
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000">
              <defs>
                <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{from}"/><stop offset="1" stop-color="{to}"/></linearGradient>
                <radialGradient id="glow" cx="0.5" cy="0.42" r="0.6"><stop offset="0" stop-color="#FFFFFF" stop-opacity="{F(0.55 - texture * 0.3)}"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient>
                <filter id="soft"><feGaussianBlur stdDeviation="{F(2 + (1 - texture) * 5)}"/></filter>
              </defs>
              <rect width="800" height="1000" fill="url(#bg)"/>
              <ellipse cx="400" cy="480" rx="300" ry="380" fill="#FFFFFF" opacity="0.18"/>
              <g filter="url(#soft)">{spots}</g>
              <rect width="800" height="1000" fill="url(#glow)"/>
              <rect x="40" y="40" rx="22" width="{(etiqueta.Length > 5 ? 210 : 160)}" height="60" fill="#1A1F26" opacity="0.82"/>
              <text x="66" y="81" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="700" fill="#FFFFFF" letter-spacing="3">{Esc(etiqueta)}</text>
              <text x="40" y="930" font-family="Inter, Arial, sans-serif" font-size="26" font-weight="600" fill="#1A1F26" opacity="0.85">{Esc(titulo)}</text>
              <text x="40" y="966" font-family="Inter, Arial, sans-serif" font-size="20" fill="#1A1F26" opacity="0.55">Imagen de muestra generada · no es una persona real</text>
            </svg>
            """;
    }

    private static string ProductSvg(string nombre, string unidad, string from, string to, int variant)
    {
        // Tres siluetas: frasco con tapa, tubo y tarro.
        var shape = (variant % 3) switch
        {
            0 => """<rect x="150" y="70" width="100" height="46" rx="8" fill="#1A1F26" opacity="0.75"/><rect x="120" y="116" width="160" height="220" rx="26" fill="#FFFFFF" opacity="0.9"/><rect x="140" y="180" width="120" height="90" rx="10" fill="url(#bg)" opacity="0.85"/>""",
            1 => """<rect x="165" y="60" width="70" height="40" rx="6" fill="#1A1F26" opacity="0.75"/><path d="M140 100 H260 L245 330 Q200 350 155 330 Z" fill="#FFFFFF" opacity="0.9"/><rect x="160" y="170" width="80" height="100" rx="8" fill="url(#bg)" opacity="0.85"/>""",
            _ => """<rect x="105" y="130" width="190" height="44" rx="12" fill="#1A1F26" opacity="0.75"/><rect x="95" y="174" width="210" height="150" rx="30" fill="#FFFFFF" opacity="0.9"/><rect x="125" y="210" width="150" height="70" rx="10" fill="url(#bg)" opacity="0.85"/>""",
        };

        return $"""
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
              <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{from}"/><stop offset="1" stop-color="{to}"/></linearGradient></defs>
              <rect width="400" height="400" fill="url(#bg)"/>
              <circle cx="330" cy="70" r="120" fill="#FFFFFF" opacity="0.14"/>
              <circle cx="50" cy="360" r="90" fill="#FFFFFF" opacity="0.12"/>
              {shape}
              <text x="200" y="378" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="17" font-weight="600" fill="#FFFFFF">{Esc(Truncate(nombre, 34))} · {Esc(unidad)}</text>
            </svg>
            """;
    }

    private static string ProcedureSvg(string nombre, string area, string from, string to, int variant)
    {
        var offset = variant * 23 % 90;
        return $"""
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
              <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{from}"/><stop offset="1" stop-color="{to}"/></linearGradient></defs>
              <rect width="800" height="450" fill="url(#bg)"/>
              <path d="M0 {300 - offset} C 200 {220 - offset}, 320 {380 - offset}, 520 {290 - offset} S 760 {240 - offset}, 800 {300 - offset} V450 H0 Z" fill="#FFFFFF" opacity="0.16"/>
              <path d="M0 {350 - offset / 2} C 180 {300 - offset / 2}, 380 {420 - offset / 2}, 560 {340 - offset / 2} S 740 {310 - offset / 2}, 800 {360 - offset / 2} V450 H0 Z" fill="#FFFFFF" opacity="0.22"/>
              <circle cx="{640 - offset}" cy="120" r="70" fill="#FFFFFF" opacity="0.2"/>
              <circle cx="{640 - offset}" cy="120" r="36" fill="#FFFFFF" opacity="0.35"/>
              <text x="48" y="92" font-family="Manrope, Inter, Arial, sans-serif" font-size="40" font-weight="700" fill="#FFFFFF">{Esc(Truncate(nombre, 30))}</text>
              <text x="48" y="132" font-family="Inter, Arial, sans-serif" font-size="22" fill="#FFFFFF" opacity="0.85">{Esc(area)}</text>
            </svg>
            """;
    }

    private static string Truncate(string s, int max) => s.Length <= max ? s : s[..(max - 1)] + "…";
}
