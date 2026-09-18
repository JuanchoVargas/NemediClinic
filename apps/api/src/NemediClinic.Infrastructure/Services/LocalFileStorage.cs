using Microsoft.Extensions.Configuration;
using NemediClinic.Application.Interfaces;

namespace NemediClinic.Infrastructure.Services;

/// <summary>
/// Storage en disco: {root}/{tenantId}/{yyyy}/{guid}{ext}. El root sale de Storage:UploadsPath
/// (por defecto /data/uploads; en Development, App_Data/uploads dentro del proyecto).
/// </summary>
public class LocalFileStorage : IFileStorage
{
    private readonly string _root;

    public LocalFileStorage(IConfiguration configuration)
    {
        var configured = configuration["Storage:UploadsPath"];
        _root = Path.GetFullPath(string.IsNullOrWhiteSpace(configured) ? "/data/uploads" : configured);
        Directory.CreateDirectory(_root);
    }

    public async Task<string> SaveAsync(Guid tenantId, string extension, Stream content, CancellationToken ct = default)
    {
        var ext = extension.StartsWith('.') ? extension : "." + extension;
        var key = $"{tenantId:D}/{DateTime.Now:yyyy}/{Guid.NewGuid():N}{ext}";
        var fullPath = Resolve(key);
        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);

        await using var file = new FileStream(fullPath, FileMode.CreateNew, FileAccess.Write, FileShare.None, 81920, useAsync: true);
        await content.CopyToAsync(file, ct);
        return key;
    }

    public Task<Stream?> OpenReadAsync(string path, CancellationToken ct = default)
    {
        var fullPath = Resolve(path);
        Stream? stream = File.Exists(fullPath)
            ? new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.Read, 81920, useAsync: true)
            : null;
        return Task.FromResult(stream);
    }

    public Task DeleteAsync(string path, CancellationToken ct = default)
    {
        var fullPath = Resolve(path);
        if (File.Exists(fullPath))
            File.Delete(fullPath);
        return Task.CompletedTask;
    }

    /// <summary>La clave viene de la base, pero igual se impide salir del root (path traversal).</summary>
    private string Resolve(string key)
    {
        var fullPath = Path.GetFullPath(Path.Combine(_root, key));
        if (!fullPath.StartsWith(_root + Path.DirectorySeparatorChar, StringComparison.Ordinal))
            throw new InvalidOperationException("Ruta de archivo fuera del almacenamiento.");
        return fullPath;
    }
}
