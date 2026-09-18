using System.Globalization;
using Microsoft.EntityFrameworkCore;
using NemediClinic.Application.DTOs.Consents;
using NemediClinic.Domain.Entities;
using NemediClinic.Domain.Enums;
using NemediClinic.Infrastructure.Persistence;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace NemediClinic.Api.Services;

/// <summary>
/// Consentimiento informado: plantilla por procedimiento (editable por tenant), firma en pantalla
/// y PDF (QuestPDF) guardado como Attachment Kind=Consentimiento en la ficha del paciente.
/// Regla de agenda: si Procedure.RequiereConsentimiento, la cita no pasa a EnCurso sin un
/// consentimiento vigente (mismo paciente y procedimiento, firmado hace menos de VigenciaDias).
/// </summary>
public class ConsentService
{
    /// <summary>Un consentimiento vale para las sesiones del mismo procedimiento durante un año.</summary>
    public const int VigenciaDias = 365;
    private const int MaxSignatureBytes = 600 * 1024;
    private static readonly CultureInfo EsCo = CultureInfo.GetCultureInfo("es-CO");

    public const string DefaultTitulo = "Consentimiento informado";
    public const string DefaultTexto =
        "Yo, {{paciente}}, identificado(a) con cédula {{cedula}}, declaro que he sido informado(a) de forma clara " +
        "sobre el procedimiento {{procedimiento}}: en qué consiste, sus beneficios esperados, sus riesgos, posibles " +
        "efectos secundarios, contraindicaciones y los cuidados que debo seguir antes y después.\n\n" +
        "Declaro que informé con veracidad mis antecedentes médicos, alergias y medicamentos actuales, que tuve la " +
        "oportunidad de hacer preguntas y que fueron resueltas a mi satisfacción.\n\n" +
        "Entiendo que los resultados pueden variar de una persona a otra y que puedo retirar este consentimiento en " +
        "cualquier momento antes de iniciar el procedimiento.\n\n" +
        "Autorizo de manera libre y voluntaria la realización del procedimiento {{procedimiento}} y la toma de " +
        "fotografías con fines exclusivos de seguimiento clínico.\n\nFecha: {{fecha}}";

    private readonly AppDbContext _db;
    private readonly AttachmentService _attachments;

    static ConsentService()
    {
        // Licencia Community de QuestPDF: gratuita para organizaciones con ingresos anuales < USD 1M
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public ConsentService(AppDbContext db, AttachmentService attachments)
    {
        _db = db;
        _attachments = attachments;
    }

    // ── Plantillas ──────────────────────────────────────────────────
    public async Task<List<ConsentTemplateDto>> ListTemplatesAsync(CancellationToken ct)
    {
        var procedures = await _db.Procedures.AsNoTracking().OrderBy(p => p.Nombre).ToListAsync(ct);
        var templates = await _db.ConsentTemplates.AsNoTracking().ToDictionaryAsync(t => t.ProcedureId, ct);
        return procedures.Select(p => ToDto(p, templates.GetValueOrDefault(p.Id))).ToList();
    }

    public async Task<ConsentTemplateDto> GetTemplateAsync(Guid procedureId, CancellationToken ct)
    {
        var procedure = await _db.Procedures.AsNoTracking().FirstOrDefaultAsync(p => p.Id == procedureId, ct)
            ?? throw ApiException.NotFound("Procedimiento no encontrado.");
        var template = await _db.ConsentTemplates.AsNoTracking().FirstOrDefaultAsync(t => t.ProcedureId == procedureId, ct);
        return ToDto(procedure, template);
    }

    public async Task<ConsentTemplateDto> SaveTemplateAsync(Guid procedureId, SaveConsentTemplateRequest request, CancellationToken ct)
    {
        if (!await _db.Procedures.AnyAsync(p => p.Id == procedureId, ct))
            throw ApiException.NotFound("Procedimiento no encontrado.");

        var template = await _db.ConsentTemplates.FirstOrDefaultAsync(t => t.ProcedureId == procedureId, ct);
        if (template is null)
        {
            template = new ConsentTemplate { ProcedureId = procedureId };
            _db.ConsentTemplates.Add(template);
        }
        template.Titulo = request.Titulo.Trim();
        template.Texto = request.Texto.Trim();
        await _db.SaveChangesAsync(ct);
        return await GetTemplateAsync(procedureId, ct);
    }

    // ── Vista previa y firma ────────────────────────────────────────
    public async Task<ConsentPreviewDto> PreviewAsync(Guid patientId, Guid procedureId, CancellationToken ct)
    {
        var (patient, procedure, template) = await LoadAsync(patientId, procedureId, ct);
        return Render(patient, procedure, template, DateTime.Now);
    }

    public async Task<ConsentDto> SignAsync(SignConsentRequest request, Guid userId, CancellationToken ct)
    {
        var (patient, procedure, template) = await LoadAsync(request.PatientId, request.ProcedureId, ct);
        var signature = DecodeSignature(request.FirmaPng);

        Guid esteticistId;
        if (request.AppointmentId.HasValue)
        {
            var appointment = await _db.Appointments.AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == request.AppointmentId.Value && a.PatientId == patient.Id, ct)
                ?? throw ApiException.BadRequest("La cita no corresponde a este paciente.");
            esteticistId = request.EsteticistId ?? appointment.EsteticistId;
        }
        else
        {
            esteticistId = request.EsteticistId ?? userId;
        }
        var esteticist = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == esteticistId, ct)
            ?? throw ApiException.BadRequest("Esteticista no encontrado.");

        var now = DateTime.Now;
        var rendered = Render(patient, procedure, template, now);
        var clinic = await _db.Tenants.AsNoTracking().Where(t => t.Id == _db.CurrentTenantId)
            .Select(t => new { t.Nombre, t.NIT }).FirstOrDefaultAsync(ct);
        var esteticistName = $"{esteticist.Nombre} {esteticist.Apellido}".Trim();

        var pdf = BuildPdf(clinic?.Nombre ?? string.Empty, clinic?.NIT ?? string.Empty, rendered, esteticistName, now, signature);

        var consent = new Consent
        {
            PatientId = patient.Id,
            ProcedureId = procedure.Id,
            AppointmentId = request.AppointmentId,
            EsteticistId = esteticist.Id,
            FechaFirma = now,
            Titulo = rendered.Titulo,
            TextoFirmado = rendered.Texto,
            FirmanteNombre = rendered.Paciente,
            FirmanteCedula = rendered.Cedula
        };
        var attachment = await _attachments.SaveGeneratedPdfAsync(
            pdf, $"consentimiento-{Slug(procedure.Nombre)}-{now:yyyyMMdd-HHmm}.pdf",
            AttachmentEntityType.Patient, patient.Id, AttachmentKind.Consentimiento, userId, ct);
        consent.AttachmentId = attachment.Id;
        _db.Consents.Add(consent);
        await _db.SaveChangesAsync(ct);

        return new ConsentDto
        {
            Id = consent.Id,
            PatientId = patient.Id,
            ProcedureId = procedure.Id,
            Procedimiento = procedure.Nombre,
            AppointmentId = consent.AppointmentId,
            Esteticista = esteticistName,
            FechaFirma = now,
            Titulo = consent.Titulo,
            AttachmentId = attachment.Id
        };
    }

    public Task<List<ConsentDto>> ListByPatientAsync(Guid patientId, CancellationToken ct) =>
        _db.Consents.AsNoTracking()
            .Where(c => c.PatientId == patientId)
            .OrderByDescending(c => c.FechaFirma)
            .Select(c => new ConsentDto
            {
                Id = c.Id,
                PatientId = c.PatientId,
                ProcedureId = c.ProcedureId,
                Procedimiento = c.Procedure.Nombre,
                AppointmentId = c.AppointmentId,
                Esteticista = c.Esteticist.Nombre + " " + c.Esteticist.Apellido,
                FechaFirma = c.FechaFirma,
                Titulo = c.Titulo,
                AttachmentId = c.AttachmentId
            })
            .ToListAsync(ct);

    /// <summary>¿Hay un consentimiento vigente de este paciente para este procedimiento?</summary>
    public Task<bool> HasValidConsentAsync(Guid patientId, Guid procedureId, CancellationToken ct = default)
    {
        var desde = DateTime.Now.AddDays(-VigenciaDias);
        return _db.Consents.AnyAsync(c => c.PatientId == patientId && c.ProcedureId == procedureId && c.FechaFirma >= desde, ct);
    }

    // ── Helpers ─────────────────────────────────────────────────────
    private async Task<(Patient, Procedure, ConsentTemplate?)> LoadAsync(Guid patientId, Guid procedureId, CancellationToken ct)
    {
        var patient = await _db.Patients.AsNoTracking().FirstOrDefaultAsync(p => p.Id == patientId, ct)
            ?? throw ApiException.NotFound("Paciente no encontrado.");
        var procedure = await _db.Procedures.AsNoTracking().FirstOrDefaultAsync(p => p.Id == procedureId, ct)
            ?? throw ApiException.NotFound("Procedimiento no encontrado.");
        var template = await _db.ConsentTemplates.AsNoTracking().FirstOrDefaultAsync(t => t.ProcedureId == procedureId, ct);
        return (patient, procedure, template);
    }

    private static ConsentPreviewDto Render(Patient patient, Procedure procedure, ConsentTemplate? template, DateTime fecha)
    {
        var paciente = $"{patient.Nombre} {patient.Apellido}".Trim();
        var texto = (template?.Texto ?? DefaultTexto)
            .Replace("{{paciente}}", paciente, StringComparison.OrdinalIgnoreCase)
            .Replace("{{cedula}}", patient.Cedula, StringComparison.OrdinalIgnoreCase)
            .Replace("{{procedimiento}}", procedure.Nombre, StringComparison.OrdinalIgnoreCase)
            .Replace("{{fecha}}", fecha.ToString("d 'de' MMMM 'de' yyyy", EsCo), StringComparison.OrdinalIgnoreCase);

        return new ConsentPreviewDto
        {
            Titulo = template?.Titulo ?? $"{DefaultTitulo} · {procedure.Nombre}",
            Texto = texto,
            Paciente = paciente,
            Cedula = patient.Cedula,
            Procedimiento = procedure.Nombre
        };
    }

    /// <summary>data URL PNG → bytes. Se comprueba la cabecera PNG y el tamaño: entra a un PDF clínico.</summary>
    private static byte[] DecodeSignature(string dataUrl)
    {
        const string prefix = "data:image/png;base64,";
        if (string.IsNullOrWhiteSpace(dataUrl) || !dataUrl.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            throw ApiException.BadRequest("La firma es obligatoria.");

        byte[] bytes;
        try { bytes = Convert.FromBase64String(dataUrl[prefix.Length..]); }
        catch (FormatException) { throw ApiException.BadRequest("La firma no es una imagen válida."); }

        ReadOnlySpan<byte> png = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        if (bytes.Length < 100 || bytes.Length > MaxSignatureBytes || !bytes.AsSpan(0, 8).SequenceEqual(png))
            throw ApiException.BadRequest("La firma no es una imagen válida.");

        // Se decodifica de verdad: un PNG corrupto dejaría el PDF firmado... sin firma.
        try
        {
            using var image = SixLabors.ImageSharp.Image.Load(bytes);
            if (image.Width < 50 || image.Height < 20)
                throw ApiException.BadRequest("La firma es demasiado pequeña.");
        }
        catch (Exception ex) when (ex is not ApiException)
        {
            throw ApiException.BadRequest("La firma no es una imagen válida.");
        }
        return bytes;
    }

    private static byte[] BuildPdf(string clinica, string nit, ConsentPreviewDto c, string esteticista, DateTime fecha, byte[] firma) =>
        Document.Create(document =>
        {
            document.Page(page =>
            {
                page.Size(PageSizes.Letter);
                page.Margin(2, Unit.Centimetre);
                page.DefaultTextStyle(t => t.FontSize(11).LineHeight(1.4f));

                page.Header().Column(col =>
                {
                    col.Item().Text(clinica).FontSize(14).SemiBold().FontColor("#1F4E79");
                    if (!string.IsNullOrWhiteSpace(nit)) col.Item().Text($"NIT {nit}").FontSize(9).FontColor(Colors.Grey.Darken1);
                    col.Item().PaddingTop(12).Text(c.Titulo).FontSize(16).SemiBold();
                    col.Item().PaddingTop(6).LineHorizontal(1).LineColor("#E6E2DA");
                });

                page.Content().PaddingVertical(14).Column(col =>
                {
                    col.Spacing(10);
                    col.Item().Table(table =>
                    {
                        table.ColumnsDefinition(cols => { cols.ConstantColumn(110); cols.RelativeColumn(); });
                        void Row(string label, string value)
                        {
                            table.Cell().PaddingVertical(2).Text(label).FontColor(Colors.Grey.Darken1);
                            table.Cell().PaddingVertical(2).Text(value).SemiBold();
                        }
                        Row("Paciente", c.Paciente);
                        Row("Cédula", c.Cedula);
                        Row("Procedimiento", c.Procedimiento);
                        Row("Fecha y hora", fecha.ToString("d 'de' MMMM 'de' yyyy, h:mm tt", EsCo));
                        Row("Esteticista", esteticista);
                    });

                    foreach (var paragraph in c.Texto.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
                        col.Item().Text(paragraph).Justify();

                    col.Item().PaddingTop(16).ShowEntire().Column(sign =>
                    {
                        sign.Item().Width(220).Height(90).Image(firma).FitArea();
                        sign.Item().Width(220).LineHorizontal(1);
                        sign.Item().Text(c.Paciente).SemiBold();
                        sign.Item().Text($"C.C. {c.Cedula}").FontSize(10).FontColor(Colors.Grey.Darken1);
                        sign.Item().Text("Firma del paciente").FontSize(9).FontColor(Colors.Grey.Darken1);
                    });
                });

                page.Footer().AlignCenter().Text(t =>
                {
                    t.DefaultTextStyle(s => s.FontSize(8).FontColor(Colors.Grey.Darken1));
                    t.Span($"Firmado digitalmente en pantalla el {fecha.ToString("dd/MM/yyyy HH:mm", EsCo)} · Página ");
                    t.CurrentPageNumber();
                    t.Span(" de ");
                    t.TotalPages();
                });
            });
        }).GeneratePdf();

    private static string Slug(string text)
    {
        var clean = new string(text.Normalize(System.Text.NormalizationForm.FormD)
            .Where(ch => CharUnicodeInfo.GetUnicodeCategory(ch) != UnicodeCategory.NonSpacingMark)
            .Select(ch => char.IsLetterOrDigit(ch) ? char.ToLowerInvariant(ch) : '-')
            .ToArray());
        return string.Join('-', clean.Split('-', StringSplitOptions.RemoveEmptyEntries)).Trim('-') is { Length: > 0 } s ? s[..Math.Min(40, s.Length)] : "procedimiento";
    }

    private static ConsentTemplateDto ToDto(Procedure p, ConsentTemplate? t) => new()
    {
        ProcedureId = p.Id,
        Procedimiento = p.Nombre,
        RequiereConsentimiento = p.RequiereConsentimiento,
        Titulo = t?.Titulo ?? $"{DefaultTitulo} · {p.Nombre}",
        Texto = t?.Texto ?? DefaultTexto,
        EsPorDefecto = t is null,
        UpdatedAt = t?.UpdatedAt
    };
}
