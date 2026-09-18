using Microsoft.EntityFrameworkCore;
using NemediClinic.Application.Interfaces;
using NemediClinic.Infrastructure.Persistence;

namespace NemediClinic.Api.Services;

/// <summary>
/// Borrado físico diferido. DELETE /files/{id} solo marca IsDeleted; este job, cada hora, borra del
/// storage los archivos de adjuntos eliminados hace más de 24 h (margen para deshacer un error) y
/// los adjuntos "pendientes" que ninguna entidad reclamó en 24 h (formularios abandonados).
/// Es un proceso de sistema sin tenant: usa IgnoreQueryFilters.
/// </summary>
public class AttachmentCleanupService : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromHours(1);
    private static readonly TimeSpan Grace = TimeSpan.FromHours(24);
    private readonly IServiceProvider _services;
    private readonly ILogger<AttachmentCleanupService> _logger;

    public AttachmentCleanupService(IServiceProvider services, ILogger<AttachmentCleanupService> logger)
    {
        _services = services;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(Interval);
        do
        {
            try
            {
                await PurgeAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogWarning("Limpieza de adjuntos falló: {Message}", ex.GetBaseException().Message);
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task PurgeAsync(CancellationToken ct)
    {
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var storage = scope.ServiceProvider.GetRequiredService<IFileStorage>();
        var limit = DateTime.UtcNow - Grace;

        var batch = await db.Attachments.IgnoreQueryFilters()
            .Where(a => a.PurgedAt == null
                && ((a.IsDeleted && a.UpdatedAt < limit) || (!a.IsDeleted && a.EntityId == null && a.CreatedAt < limit)))
            .OrderBy(a => a.UpdatedAt)
            .Take(200)
            .ToListAsync(ct);

        foreach (var attachment in batch)
        {
            await storage.DeleteAsync(attachment.StoragePath, ct);
            await storage.DeleteAsync(attachment.ThumbnailPath, ct);
            attachment.IsDeleted = true;
            attachment.PurgedAt = DateTime.UtcNow;
        }

        if (batch.Count > 0)
        {
            // SaveChangesAsync del contexto solo estampa TenantId en Added; aquí todo es Modified.
            await db.SaveChangesAsync(ct);
            _logger.LogInformation("Adjuntos purgados del storage: {Count}", batch.Count);
        }
    }
}
