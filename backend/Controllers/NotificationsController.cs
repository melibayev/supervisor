using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LGSupervisor.Api.Data;
using LGSupervisor.Api.Models;
using LGSupervisor.Api.Models.DTOs;

namespace LGSupervisor.Api.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly AppDbContext _db;

    public NotificationsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<NotificationDto>>> GetAll(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20,
        [FromQuery] bool? unreadOnly = null)
    {
        var uid = GetUserId();
        var q = _db.Notifications.Where(n => n.RecipientId == uid);
        if (unreadOnly == true) q = q.Where(n => !n.IsRead);

        var total = await q.CountAsync();
        var items = await q.OrderByDescending(n => n.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(n => new NotificationDto(
                n.Id, n.Type.ToString(), n.Title, n.Body, n.IsRead,
                n.CreatedAt, n.ReadAt, n.RelatedEntityId, n.RelatedEntityType, n.ActionUrl, n.MetadataJson))
            .ToListAsync();

        return Ok(new PagedResult<NotificationDto>(items, total, page, pageSize));
    }

    [HttpGet("unread-count")]
    public async Task<ActionResult<UnreadCountDto>> GetUnreadCount()
    {
        var uid = GetUserId();
        var count = await _db.Notifications.CountAsync(n => n.RecipientId == uid && !n.IsRead);
        return Ok(new UnreadCountDto(count));
    }

    [HttpPut("{id}/read")]
    public async Task<IActionResult> MarkRead(Guid id)
    {
        var uid = GetUserId();
        var notif = await _db.Notifications.FirstOrDefaultAsync(n => n.Id == id && n.RecipientId == uid);
        if (notif == null) return NotFound();

        notif.IsRead = true;
        notif.ReadAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("read-all")]
    public async Task<IActionResult> MarkAllRead()
    {
        var uid = GetUserId();
        var unread = await _db.Notifications
            .Where(n => n.RecipientId == uid && !n.IsRead)
            .ToListAsync();

        foreach (var n in unread)
        {
            n.IsRead = true;
            n.ReadAt = DateTime.UtcNow;
        }
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var uid = GetUserId();
        var notif = await _db.Notifications.FirstOrDefaultAsync(n => n.Id == id && n.RecipientId == uid);
        if (notif == null) return NotFound();

        _db.Notifications.Remove(notif);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
