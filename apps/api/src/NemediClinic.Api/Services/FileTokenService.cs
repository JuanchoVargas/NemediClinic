using System.Security.Cryptography;
using System.Text;

namespace NemediClinic.Api.Services;

/// <summary>
/// Token de descarga: "{exp}.{tenantId}.{firma}", firma = HMAC-SHA256(attachmentId|tenantId|exp).
/// Un &lt;img&gt; no puede mandar el header Authorization, así que la URL lleva este token de
/// 10 minutos atado al archivo Y al tenant: no sirve para otro adjunto ni para otro tenant.
/// La clave se deriva de Jwt:Secret (o Files:SigningKey si se define) con un prefijo propio,
/// para que un token de archivo nunca sea intercambiable con la firma de un JWT.
/// </summary>
public class FileTokenService
{
    public static readonly TimeSpan Lifetime = TimeSpan.FromMinutes(10);
    private readonly byte[] _key;

    public FileTokenService(IConfiguration configuration)
    {
        var secret = configuration["Files:SigningKey"] ?? configuration["Jwt:Secret"]
            ?? throw new InvalidOperationException("Jwt:Secret no está configurado.");
        _key = SHA256.HashData(Encoding.UTF8.GetBytes("nemedi-files-v1:" + secret));
    }

    public (string Token, DateTime ExpiresAtUtc) Create(Guid attachmentId, Guid tenantId)
    {
        var expiresAt = DateTime.UtcNow.Add(Lifetime);
        var exp = new DateTimeOffset(expiresAt).ToUnixTimeSeconds();
        return ($"{exp}.{tenantId:N}.{Sign(attachmentId, tenantId, exp)}", expiresAt);
    }

    /// <summary>Devuelve el tenant del token si la firma es válida y no expiró; si no, null.</summary>
    public Guid? Validate(Guid attachmentId, string? token)
    {
        var parts = token?.Split('.');
        if (parts is not { Length: 3 }
            || !long.TryParse(parts[0], out var exp)
            || !Guid.TryParseExact(parts[1], "N", out var tenantId))
            return null;

        if (DateTimeOffset.UtcNow.ToUnixTimeSeconds() > exp)
            return null;

        var expected = Encoding.ASCII.GetBytes(Sign(attachmentId, tenantId, exp));
        var actual = Encoding.ASCII.GetBytes(parts[2]);
        return CryptographicOperations.FixedTimeEquals(expected, actual) ? tenantId : null;
    }

    private string Sign(Guid attachmentId, Guid tenantId, long exp)
    {
        var payload = Encoding.ASCII.GetBytes($"{attachmentId:N}|{tenantId:N}|{exp}");
        var hash = HMACSHA256.HashData(_key, payload);
        return Convert.ToBase64String(hash).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }
}
