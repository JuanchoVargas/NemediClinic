using System.Security.Cryptography;

namespace NemediClinic.Api.Services;

/// <summary>Regla única de contraseñas: mínimo 8 caracteres con al menos una letra y un número.</summary>
public static class PasswordPolicy
{
    public const int MinLength = 8;

    /// <summary>Mensaje de error si la contraseña no cumple; null si es válida.</summary>
    public static string? Validate(string? password)
    {
        if (string.IsNullOrEmpty(password) || password.Length < MinLength)
            return $"La contraseña debe tener al menos {MinLength} caracteres.";
        if (!password.Any(char.IsLetter) || !password.Any(char.IsDigit))
            return "La contraseña debe incluir al menos una letra y un número.";
        return null;
    }

    /// <summary>12 caracteres sin ambiguos (0/O, 1/l/I) + sufijo que garantiza mayúscula, minúscula, dígito y símbolo.</summary>
    public static string GenerateTemporary()
    {
        const string alphabet = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
        var chars = new char[12];
        for (var i = 0; i < chars.Length; i++)
            chars[i] = alphabet[RandomNumberGenerator.GetInt32(alphabet.Length)];
        return new string(chars) + "Aa7!";
    }
}
