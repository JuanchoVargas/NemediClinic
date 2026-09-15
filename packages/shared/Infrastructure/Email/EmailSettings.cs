namespace Nemedi.CRM.Api.Infrastructure.Email;

public class EmailSettings {
	public string Host { get; set; } = string.Empty;
	public int Port { get; set; } = 465;
	public bool EnableSsl { get; set; } = true;
	public string Username { get; set; } = string.Empty;
	public string Password { get; set; } = string.Empty;
	public string From { get; set; } = string.Empty;
	public string FromName { get; set; } = "NemediCRM";

	// Directorio base del store del Front (se toma de appsettings: LocalStoreDir)
	// Ej: D:\\web\\nemedi\\crm\\app\\Front\\public\\store
	public string? LocalStoreDir { get; set; }

	// Ruta absoluta opcional del archivo de plantilla HTML a usar (si está establecida se usa esta).
	public string? TemplatePath { get; set; }

	// Ya no se usa TemplateRelativePath; se conserva por compatibilidad de configuración,
	// pero el código resolverá la ruta del template a partir de TemplatePath o LocalStoreDir.
	public string? TemplateRelativePath { get; set; } = null;

	// URL base del Front para recursos en emails (imgs y links)
	// NOTE: FrontBaseUrl moved to AppPaths for global access.

	// Tiempo máximo de espera para envíos SMTP (ms)
	public int SmtpTimeoutMs { get; set; } = 15000;
}

public interface IEmailService {
	Task SendAsync(string toEmail, string subject, string bodyHtml, CancellationToken ct = default);
	Task SendUsingTemplateAsync(
		string toEmail,
		string subject,
		string bodyInnerHtml,
		string tenantName,
		string? tenantPhone = null,
		string? tenantAddress = null,
		string? tenantCity = null,
		string? tenantState = null,
		string? tenantCountry = null,
		string? tenantLogoUrl = null,
		string? tenantLogoAlt = null,
		CancellationToken ct = default);
}