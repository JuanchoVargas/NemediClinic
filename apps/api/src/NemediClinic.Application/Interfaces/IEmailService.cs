namespace NemediClinic.Application.Interfaces;

public interface IEmailService
{
    /// <summary>false si no hay SMTP configurado: quien llama sigue sin correo (nunca es un error).</summary>
    bool IsConfigured { get; }

    /// <summary>Envía un correo de texto plano. Devuelve false si no se pudo enviar (se registra en el log).</summary>
    Task<bool> SendAsync(string to, string subject, string body, CancellationToken ct = default);
}
