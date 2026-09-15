using System.Net;
using System.Net.Mail;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using Nemedi.CRM.Api.Infrastructure;

namespace Nemedi.CRM.Api.Infrastructure.Email;

public class SmtpEmailService : IEmailService {
	private readonly EmailSettings _settings;
	private readonly AppPaths? _appPaths;

	public SmtpEmailService(EmailSettings settings, AppPaths appPaths) {
		_settings = settings;
		_appPaths = appPaths;
	}

	public async Task SendAsync(string toEmail, string subject, string bodyHtml, CancellationToken ct = default) {
		var fromAddress = string.IsNullOrWhiteSpace(_settings.From) ? _settings.Username : _settings.From;
		var msg = new MimeMessage();
		msg.From.Add(new MailboxAddress(_settings.FromName ?? string.Empty, fromAddress));
		msg.To.Add(MailboxAddress.Parse(toEmail));
		msg.Subject = subject;
		msg.Body = new BodyBuilder { HtmlBody = bodyHtml }.ToMessageBody();

		using var client = new MailKit.Net.Smtp.SmtpClient();
		client.Timeout = Math.Max(3000, _settings.SmtpTimeoutMs);

		try {
			// SSL/STARTTLS handling
			var secure = _settings.EnableSsl;
			var host = _settings.Host;
			var port = _settings.Port;

			if (port == 465 && secure) {
				await client.ConnectAsync(host, port, SecureSocketOptions.SslOnConnect, ct);
			} else if (secure) {
				await client.ConnectAsync(host, port, SecureSocketOptions.StartTls, ct);
			} else {
				await client.ConnectAsync(host, port, SecureSocketOptions.None, ct);
			}

			// Authenticate when credentials provided
			if (!string.IsNullOrWhiteSpace(_settings.Username)) {
				await client.AuthenticateAsync(_settings.Username, _settings.Password, ct);
			}

			await client.SendAsync(msg, ct);
			await client.DisconnectAsync(true, ct);
		} catch (MailKit.Security.SslHandshakeException sslEx) {
			throw new InvalidOperationException($"SMTP SSL/TLS handshake failed (host={_settings.Host}, port={_settings.Port}, ssl={_settings.EnableSsl}). {sslEx.Message}", sslEx);
		} catch (MailKit.ServiceNotAuthenticatedException authEx) {
			throw new InvalidOperationException($"SMTP authentication failed for user '{_settings.Username}'. {authEx.Message}", authEx);
		} catch (MailKit.CommandException cmdEx) {
			throw new InvalidOperationException($"SMTP command error: {cmdEx.Message}", cmdEx);
		} catch (OperationCanceledException ocex) when (ct.IsCancellationRequested) {
			throw new TimeoutException($"SMTP send timed out after {_settings.SmtpTimeoutMs} ms (host={_settings.Host}, port={_settings.Port}, ssl={_settings.EnableSsl}).", ocex);
		} catch (Exception ex) {
			throw new InvalidOperationException($"SMTP send failed (host={_settings.Host}, port={_settings.Port}, ssl={_settings.EnableSsl}, timeoutMs={_settings.SmtpTimeoutMs}, from={_settings.From ?? _settings.Username}, to={toEmail}). {ex.Message}", ex);
		}
	}

	public async Task SendUsingTemplateAsync(string toEmail, string subject, string bodyInnerHtml, string tenantName, string? tenantPhone = null, string? tenantAddress = null, string? tenantCity = null, string? tenantState = null, string? tenantCountry = null, string? tenantLogoUrl = null, string? tenantLogoAlt = null, CancellationToken ct = default) {
		// Construir ruta del template: si TemplatePath está definido, usarlo; de lo contrario, derivar desde LocalStoreDir
		string html;
		string? candidate = null;
		if (!string.IsNullOrWhiteSpace(_settings.TemplatePath)) {
			var tp = _settings.TemplatePath!;
			// If TemplatePath is relative, resolve from LocalStoreDir
			if (!Path.IsPathRooted(tp)) {
				// Prefer computed physical root (physicalRoot\store) when available
				if (_appPaths != null && !string.IsNullOrWhiteSpace(_appPaths.PhysicalRootDir)) {
					tp = Path.Combine(_appPaths.PhysicalRootDir, "store", tp);
				} else if (!string.IsNullOrWhiteSpace(_settings.LocalStoreDir)) {
					tp = Path.Combine(_settings.LocalStoreDir!, tp);
				}
			}
			if (File.Exists(tp)) {
				candidate = tp;
			}
		}
		// If not found, search inside physicalRoot\store or configured LocalStoreDir
		var baseStoreDir = !string.IsNullOrWhiteSpace(_appPaths?.PhysicalRootDir) ? Path.Combine(_appPaths!.PhysicalRootDir, "store") : _settings.LocalStoreDir;
		if (candidate is null && !string.IsNullOrWhiteSpace(baseStoreDir)) {
			try {
				var preferred = Path.Combine(baseStoreDir!, "tpl", "mail.html");
				var fallback = Path.Combine(baseStoreDir!, "tpl", "mail.html");
				candidate = File.Exists(preferred) ? preferred : (File.Exists(fallback) ? fallback : null);
			} catch { /* ignore path issues */ }
		}

		if (!string.IsNullOrWhiteSpace(candidate) && File.Exists(candidate)) {
			html = await File.ReadAllTextAsync(candidate!, ct);
		} else {
			// Fallback minimal template si no existe
			html = $"<html><body><div>{bodyInnerHtml}</div><hr/><small>{tenantName}</small></body></html>";
		}

		// Build optional logo block (kept minimal for email client compatibility)
		string logoBlock = string.Empty;
		if (!string.IsNullOrWhiteSpace(tenantLogoUrl)) {
			var alt = string.IsNullOrWhiteSpace(tenantLogoAlt) ? tenantName : tenantLogoAlt;
			logoBlock = $"<tr><td style=\"padding:12px 24px 0 24px; text-align:left;\"><img src=\"{tenantLogoUrl}\" alt=\"{System.Net.WebUtility.HtmlEncode(alt)}\" style=\"height:36px; max-width:200px; display:block;\"/></td></tr>";
		}

		var basePath = (_appPaths?.FrontBaseUrl ?? "https://crm.nemedi.com/").TrimEnd('/');
		html = html
					.Replace("{BasePath}", basePath)
						.Replace("{Body}", bodyInnerHtml)
						.Replace("{TenantName}", tenantName)
						.Replace("{TenantPhone}", tenantPhone ?? "")
						.Replace("{TenantAddress}", tenantAddress ?? "")
						.Replace("{TenantCity}", tenantCity ?? "")
						.Replace("{TenantState}", tenantState ?? "")
						.Replace("{TenantCountry}", tenantCountry ?? "")
				.Replace("{TenantLogo}", logoBlock)
						.Replace("{Year}", DateTime.Now.Year.ToString());

		await SendAsync(toEmail, subject, html, ct);
	}
}