using System.ComponentModel.DataAnnotations;

namespace NemediClinic.Application.DTOs.Auth;

public class ChangePasswordRequest
{
    [Required]
    public string CurrentPassword { get; set; } = string.Empty;

    /// <summary>Mínimo 8 caracteres con al menos una letra y un número (PasswordPolicy).</summary>
    [Required]
    public string NewPassword { get; set; } = string.Empty;
}

/// <summary>Resultado de restablecer una contraseña. La clave temporal se muestra UNA sola vez.</summary>
public class ResetPasswordResponse
{
    public Guid UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordTemporal { get; set; } = string.Empty;
    /// <summary>true si además se envió por correo (solo si hay SMTP configurado).</summary>
    public bool EmailEnviado { get; set; }
}
