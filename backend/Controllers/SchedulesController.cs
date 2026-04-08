using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LGSupervisor.Api.Data;
using LGSupervisor.Api.Models;
using LGSupervisor.Api.Models.DTOs;
using LGSupervisor.Api.Services;

namespace LGSupervisor.Api.Controllers;

[ApiController]
[Route("api/schedules")]
[Authorize]
public class SchedulesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IAuditService _audit;
    private readonly INotificationService _notifications;

    public SchedulesController(AppDbContext db, IAuditService audit, INotificationService notifications)
    {
        _db = db;
        _audit = audit;
        _notifications = notifications;
    }

    [HttpGet]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<ActionResult<PagedResult<ScheduleDto>>> GetAll(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 50,
        [FromQuery] DateTime? date = null, [FromQuery] string? regionId = null,
        [FromQuery] Guid? employeeId = null, [FromQuery] Guid? storeId = null,
        [FromQuery] string? status = null,
        [FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null)
    {
        var q = _db.VisitSchedules
            .Include(s => s.Employee)
            .Include(s => s.Store)
            .Include(s => s.CreatedByAdmin)
            .AsQueryable();

        if (date.HasValue) q = q.Where(s => s.DueDate.Date == date.Value.Date);
        if (!string.IsNullOrEmpty(regionId) && regionId != "all") q = q.Where(s => s.Store.RegionId == regionId);
        if (employeeId.HasValue) q = q.Where(s => s.EmployeeId == employeeId);
        if (storeId.HasValue) q = q.Where(s => s.StoreId == storeId);
        if (!string.IsNullOrEmpty(status) && Enum.TryParse<ScheduleStatus>(status, out var st))
            q = q.Where(s => s.Status == st);
        if (from.HasValue) q = q.Where(s => s.DueDate >= from.Value.Date);
        if (to.HasValue) q = q.Where(s => s.DueDate <= to.Value.Date);

        var total = await q.CountAsync();
        var items = await q.OrderByDescending(s => s.DueDate).ThenBy(s => s.Employee.FullName)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(s => MapSchedule(s))
            .ToListAsync();

        return Ok(new PagedResult<ScheduleDto>(items, total, page, pageSize));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ScheduleDto>> Get(Guid id)
    {
        var s = await _db.VisitSchedules
            .Include(s => s.Employee).Include(s => s.Store).Include(s => s.CreatedByAdmin)
            .FirstOrDefaultAsync(s => s.Id == id);
        if (s == null) return NotFound();
        return Ok(MapSchedule(s));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<ActionResult<ScheduleDto>> Create([FromBody] CreateScheduleRequest req)
    {
        var employee = await _db.Users.FindAsync(req.EmployeeId);
        var store = await _db.Stores.FindAsync(req.StoreId);
        if (employee == null || store == null) return NotFound();

        var adminId = GetUserId();
        var schedule = new VisitSchedule
        {
            EmployeeId = req.EmployeeId,
            StoreId = req.StoreId,
            DueDate = DateTime.SpecifyKind(req.DueDate.Date, DateTimeKind.Utc),
            DueTime = req.DueTime,
            AdminNotes = req.AdminNotes,
            CreatedByAdminId = adminId
        };

        _db.VisitSchedules.Add(schedule);
        await _db.SaveChangesAsync();

        await _audit.LogAsync(adminId, nameof(AuditAction.ScheduleCreated), "VisitSchedule", schedule.Id.ToString(), null,
            new { req.EmployeeId, req.StoreId, req.DueDate }, GetIp(),
            store.Name, $"Scheduled {employee.FullName} to visit {store.Name} on {req.DueDate:MMM d}", store.RegionId);

        await _notifications.CreateAndSendAsync(new Notification
        {
            RecipientId = req.EmployeeId,
            Type = NotificationType.ScheduleCreated,
            Title = "New Visit Scheduled 📅",
            Body = $"You have a visit to {store.Name} on {req.DueDate:MMM d}",
            RelatedEntityId = schedule.Id.ToString(),
            RelatedEntityType = "VisitSchedule",
            ActionUrl = "/dashboard",
            MetadataJson = JsonSerializer.Serialize(new { storeName = store.Name, date = req.DueDate.ToString("MMM d") })
        });

        var result = await _db.VisitSchedules
            .Include(s => s.Employee).Include(s => s.Store).Include(s => s.CreatedByAdmin)
            .FirstAsync(s => s.Id == schedule.Id);
        return Created($"/api/schedules/{schedule.Id}", MapSchedule(result));
    }

    [HttpPost("bulk")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<ActionResult<object>> BulkCreate([FromBody] BulkCreateScheduleRequest req)
    {
        var adminId = GetUserId();
        var employees = await _db.Users.Where(u => req.EmployeeIds.Contains(u.Id)).ToListAsync();
        var stores = await _db.Stores.Where(s => req.StoreIds.Contains(s.Id)).ToListAsync();

        var schedules = new List<VisitSchedule>();
        var notifications = new List<Notification>();

        for (var date = DateTime.SpecifyKind(req.StartDate.Date, DateTimeKind.Utc); date <= req.EndDate.Date; date = date.AddDays(1))
        {
            foreach (var emp in employees)
            {
                foreach (var store in stores)
                {
                    var schedule = new VisitSchedule
                    {
                        EmployeeId = emp.Id,
                        StoreId = store.Id,
                        DueDate = DateTime.SpecifyKind(date, DateTimeKind.Utc),
                        AdminNotes = req.AdminNotes,
                        CreatedByAdminId = adminId
                    };
                    schedules.Add(schedule);

                    notifications.Add(new Notification
                    {
                        RecipientId = emp.Id,
                        Type = NotificationType.ScheduleCreated,
                        Title = "New Visit Scheduled 📅",
                        Body = $"You have a visit to {store.Name} on {date:MMM d}",
                        RelatedEntityId = schedule.Id.ToString(),
                        RelatedEntityType = "VisitSchedule",
                        ActionUrl = "/dashboard",
                        MetadataJson = JsonSerializer.Serialize(new { storeName = store.Name, date = date.ToString("MMM d") })
                    });
                }
            }
        }

        _db.VisitSchedules.AddRange(schedules);
        _db.Notifications.AddRange(notifications);
        await _db.SaveChangesAsync();

        return Created("", new { created = schedules.Count });
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateScheduleRequest req)
    {
        var schedule = await _db.VisitSchedules.FindAsync(id);
        if (schedule == null) return NotFound();
        if (schedule.Status != ScheduleStatus.Pending)
            return BadRequest(new { message = "Can only edit pending schedules" });

        if (req.DueDate.HasValue) schedule.DueDate = DateTime.SpecifyKind(req.DueDate.Value.Date, DateTimeKind.Utc);
        if (req.DueTime != null) schedule.DueTime = req.DueTime;
        if (req.AdminNotes != null) schedule.AdminNotes = req.AdminNotes;
        schedule.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> Cancel(Guid id)
    {
        var schedule = await _db.VisitSchedules.Include(s => s.Store).FirstOrDefaultAsync(s => s.Id == id);
        if (schedule == null) return NotFound();

        schedule.Status = ScheduleStatus.Cancelled;
        schedule.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        await _audit.LogAsync(GetUserId(), nameof(AuditAction.ScheduleCancelled), "VisitSchedule", id.ToString(), null, null, GetIp());

        await _notifications.CreateAndSendAsync(new Notification
        {
            RecipientId = schedule.EmployeeId,
            Type = NotificationType.ScheduleCancelled,
            Title = "Schedule Cancelled",
            Body = $"Your visit to {schedule.Store.Name} on {schedule.DueDate:MMM d} was cancelled",
            RelatedEntityId = schedule.Id.ToString(),
            RelatedEntityType = "VisitSchedule",
            ActionUrl = "/dashboard",
            MetadataJson = JsonSerializer.Serialize(new { storeName = schedule.Store.Name, date = schedule.DueDate.ToString("MMM d") })
        });

        return NoContent();
    }

    [HttpGet("my")]
    public async Task<ActionResult<List<ScheduleDto>>> GetMySchedules([FromQuery] DateTime? date = null)
    {
        var uid = GetUserId();
        var q = _db.VisitSchedules
            .Include(s => s.Employee).Include(s => s.Store).Include(s => s.CreatedByAdmin)
            .Where(s => s.EmployeeId == uid);

        if (date.HasValue) q = q.Where(s => s.DueDate.Date == date.Value.Date);

        var items = await q.OrderBy(s => s.DueDate)
            .Select(s => MapSchedule(s)).ToListAsync();

        return Ok(items);
    }

    [HttpGet("my/today")]
    public async Task<ActionResult<List<ScheduleDto>>> GetMyTodaySchedules()
    {
        var uid = GetUserId();
        var today = DateTime.UtcNow.Date;
        var items = await _db.VisitSchedules
            .Include(s => s.Employee).Include(s => s.Store).Include(s => s.CreatedByAdmin)
            .Where(s => s.EmployeeId == uid && s.DueDate.Date == today)
            .OrderBy(s => s.DueDate)
            .Select(s => MapSchedule(s)).ToListAsync();

        return Ok(items);
    }

    [HttpGet("missed")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<ActionResult<List<ScheduleDto>>> GetMissed(
        [FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null, [FromQuery] string? regionId = null)
    {
        var q = _db.VisitSchedules
            .Include(s => s.Employee).Include(s => s.Store).Include(s => s.CreatedByAdmin)
            .Where(s => s.Status == ScheduleStatus.Missed);

        if (from.HasValue) q = q.Where(s => s.DueDate >= from.Value.Date);
        if (to.HasValue) q = q.Where(s => s.DueDate <= to.Value.Date);
        if (!string.IsNullOrEmpty(regionId) && regionId != "all") q = q.Where(s => s.Store.RegionId == regionId);

        var items = await q.OrderByDescending(s => s.DueDate)
            .Select(s => MapSchedule(s)).ToListAsync();

        return Ok(items);
    }

    [HttpPost("mark-missed")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> MarkMissed()
    {
        using var scope = HttpContext.RequestServices.CreateScope();
        var job = scope.ServiceProvider.GetRequiredService<MarkMissedSchedulesJob>();
        await job.MarkMissedAsync();
        return Ok(new { message = "Missed schedules processed" });
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string GetIp() => HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

    private static ScheduleDto MapSchedule(VisitSchedule s) => new(
        s.Id, s.EmployeeId, s.Employee.FullName, s.Employee.AvatarUrl,
        s.StoreId, s.Store.Name, s.Store.RegionId,
        s.DueDate, s.DueTime,
        s.Status.ToString(), s.ActualVisitId, s.AdminNotes,
        s.CreatedByAdminId, s.CreatedByAdmin.FullName,
        s.CreatedAt, s.UpdatedAt);
}
