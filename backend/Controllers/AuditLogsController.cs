using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LGSupervisor.Api.Data;
using LGSupervisor.Api.Models.DTOs;

namespace LGSupervisor.Api.Controllers;

[ApiController]
[Route("api/audit-logs")]
[Authorize(Roles = "Admin,SuperAdmin")]
public class AuditLogsController : ControllerBase
{
    private readonly AppDbContext _db;

    public AuditLogsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<AuditLogDto>>> GetAll(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 50,
        [FromQuery] Guid? userId = null, [FromQuery] string? action = null,
        [FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null,
        [FromQuery] string? entityType = null, [FromQuery] string? regionId = null)
    {
        var q = _db.AuditLogs.Include(a => a.User).AsQueryable();

        // Admin sees only their region, SuperAdmin sees all
        var role = User.FindFirstValue(ClaimTypes.Role);
        if (role == "Admin")
        {
            var currentUser = await _db.Users.FindAsync(GetUserId());
            if (currentUser?.RegionId != null)
                q = q.Where(a => a.RegionId == currentUser.RegionId || a.RegionId == null);
        }

        if (userId.HasValue) q = q.Where(a => a.UserId == userId);
        if (!string.IsNullOrEmpty(action)) q = q.Where(a => a.Action == action);
        if (from.HasValue) q = q.Where(a => a.Timestamp >= from.Value);
        if (to.HasValue) q = q.Where(a => a.Timestamp <= to.Value);
        if (!string.IsNullOrEmpty(entityType)) q = q.Where(a => a.EntityType == entityType);
        if (!string.IsNullOrEmpty(regionId) && regionId != "all") q = q.Where(a => a.RegionId == regionId);

        var total = await q.CountAsync();
        var items = await q.OrderByDescending(a => a.Timestamp)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(a => new AuditLogDto(
                a.Id, a.UserId, a.User != null ? a.User.FullName : null, a.Action,
                a.EntityType, a.EntityId, a.EntityName, a.Description,
                a.OldValues, a.NewValues,
                a.IpAddress, a.Timestamp, a.RegionId))
            .ToListAsync();

        return Ok(new PagedResult<AuditLogDto>(items, total, page, pageSize));
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
