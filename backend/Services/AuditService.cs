using System.Text.Json;
using LGSupervisor.Api.Data;
using LGSupervisor.Api.Models;

namespace LGSupervisor.Api.Services;

public interface IAuditService
{
    Task LogAsync(Guid? userId, string action, string entityType, string? entityId, object? oldValues, object? newValues, string ipAddress, string? entityName = null, string? description = null, string? regionId = null);
}

public class AuditService : IAuditService
{
    private readonly AppDbContext _db;

    public AuditService(AppDbContext db)
    {
        _db = db;
    }

    public async Task LogAsync(Guid? userId, string action, string entityType, string? entityId, object? oldValues, object? newValues, string ipAddress, string? entityName = null, string? description = null, string? regionId = null)
    {
        var log = new AuditLog
        {
            UserId = userId,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            EntityName = entityName,
            Description = description,
            OldValues = oldValues != null ? JsonSerializer.Serialize(oldValues) : null,
            NewValues = newValues != null ? JsonSerializer.Serialize(newValues) : null,
            IpAddress = ipAddress,
            RegionId = regionId
        };

        _db.AuditLogs.Add(log);
        await _db.SaveChangesAsync();
    }
}
