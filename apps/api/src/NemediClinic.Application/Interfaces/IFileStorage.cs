namespace NemediClinic.Application.Interfaces;

/// <summary>
/// Almacenamiento de binarios. Hoy LocalFileStorage (disco); la interfaz solo habla de
/// claves opacas ("{tenantId}/{yyyy}/{guid}.ext") para poder cambiarla por S3/R2 sin tocar el resto.
/// </summary>
public interface IFileStorage
{
    /// <summary>Guarda el contenido y devuelve la clave con la que se recupera.</summary>
    Task<string> SaveAsync(Guid tenantId, string extension, Stream content, CancellationToken ct = default);

    /// <summary>Abre el archivo para lectura, o null si no existe.</summary>
    Task<Stream?> OpenReadAsync(string path, CancellationToken ct = default);

    Task DeleteAsync(string path, CancellationToken ct = default);
}
