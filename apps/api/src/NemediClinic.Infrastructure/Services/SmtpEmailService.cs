using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using NemediClinic.Application.Interfaces;

namespace NemediClinic.Infrastructure.Services;

/// <summary>
/// Correo por SMTP. Configuración en la sección "Smtp" (en Docker: Smtp__Host, Smtp__Port, Smtp__User,
/// Smtp__Password, Smtp__From, Smtp__EnableSsl). Sin Smtp:Host no está configurado y no envía nada.
/// Un fallo de envío nunca tumba la operación que lo pidió: se registra y devuelve false.
/// </summary>
public class SmtpEmailService : IEmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<SmtpEmailService> _logger;

    public SmtpEmailService(IConfiguration config, ILogger<SmtpEmailService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public bool IsConfigured => !string.IsNullOrWhiteSpace(_config["Smtp:Host"]);

    public async Task<bool> SendAsync(string to, string subject, string body, CancellationToken ct = default)
    {
        if (!IsConfigured)
            return false;

        try
        {
            var user = _config["Smtp:User"];
            var from = _config["Smtp:From"] ?? user ?? "no-reply@localhost";
            using var client = new SmtpClient(_config["Smtp:Host"], int.TryParse(_config["Smtp:Port"], out var port) ? port : 587)
            {
                EnableSsl = !bool.TryParse(_config["Smtp:EnableSsl"], out var ssl) || ssl,
                Credentials = string.IsNullOrWhiteSpace(user) ? null : new NetworkCredential(user, _config["Smtp:Password"])
            };
            using var message = new MailMessage(from, to, subject, body);
            await client.SendMailAsync(message, ct);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogWarning("No se pudo enviar el correo a {To}: {Message}", to, ex.GetBaseException().Message);
            return false;
        }
    }
}
