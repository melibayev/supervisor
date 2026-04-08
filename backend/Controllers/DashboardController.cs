using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LGSupervisor.Api.Data;
using LGSupervisor.Api.Models;

namespace LGSupervisor.Api.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize(Roles = "Admin,SuperAdmin")]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _db;

    public DashboardController(AppDbContext db)
    {
        _db = db;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string GetRole() => User.FindFirstValue(ClaimTypes.Role)!;

    private async Task<(string? regionId, User admin)> GetAdminContext()
    {
        var admin = await _db.Users.FindAsync(GetUserId());
        var role = GetRole();
        string? regionId = role == "Admin" ? admin?.RegionId : null;
        return (regionId, admin!);
    }

    // ── Endpoint 1: Dashboard Summary ──────────────────────

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        var (regionId, admin) = await GetAdminContext();
        var role = GetRole();
        var todayStart = DateTime.SpecifyKind(DateTime.UtcNow.Date, DateTimeKind.Utc);
        var todayEnd = todayStart.AddDays(1);

        // Today's schedules
        var schedulesQuery = _db.VisitSchedules
            .Where(s => s.DueDate >= todayStart && s.DueDate < todayEnd);

        if (regionId != null)
            schedulesQuery = schedulesQuery.Where(s => s.Store.RegionId == regionId);

        var schedules = await schedulesQuery
            .Select(s => new { s.Status, s.EmployeeId, s.ActualVisitId })
            .ToListAsync();

        var scheduledVisits = schedules.Count;
        var completedVisits = schedules.Count(s => s.Status == ScheduleStatus.Completed);
        var missedVisits = schedules.Count(s => s.Status == ScheduleStatus.Missed);

        // In-progress visits right now
        var inProgressQuery = _db.Visits
            .Where(v => v.Status == VisitStatus.InProgress && v.CheckInTime >= todayStart);
        if (regionId != null)
            inProgressQuery = inProgressQuery.Where(v => v.Store.RegionId == regionId);
        var inProgressVisits = await inProgressQuery.CountAsync();

        var completionRate = scheduledVisits > 0 ? Math.Round((double)completedVisits / scheduledVisits * 100, 1) : 0;

        // Attention items
        var reviewQuery = _db.Visits
            .Where(v => v.Status == VisitStatus.Completed && v.ReviewStatus == ReviewStatus.NotReviewed);
        if (regionId != null)
            reviewQuery = reviewQuery.Where(v => v.Store.RegionId == regionId);
        var visitsAwaitingReview = await reviewQuery.CountAsync();

        var pendingRegQuery = _db.Users.Where(u => u.AccountStatus == UserAccountStatus.Pending);
        if (regionId != null)
            pendingRegQuery = pendingRegQuery.Where(u => u.RegionId == regionId);
        var pendingRegistrations = await pendingRegQuery.CountAsync();

        // Employees with scheduled visits today but no check-in
        var scheduledEmployeeIds = schedules
            .Where(s => s.Status == ScheduleStatus.Pending || s.Status == ScheduleStatus.Missed)
            .Select(s => s.EmployeeId)
            .Distinct()
            .ToList();

        var employeesWithVisitToday = await _db.Visits
            .Where(v => v.CheckInTime >= todayStart && v.CheckInTime < todayEnd)
            .Select(v => v.UserId)
            .Distinct()
            .ToListAsync();

        var employeesWithNoActivityToday = scheduledEmployeeIds
            .Except(employeesWithVisitToday)
            .Count();

        var adminName = admin.FullName;
        var regionName = role == "SuperAdmin" ? "All Regions" : (admin.RegionName ?? "Unknown");

        return Ok(new
        {
            adminName,
            regionName,
            isSuperAdmin = role == "SuperAdmin",
            today = new
            {
                scheduledVisits,
                completedVisits,
                missedVisits,
                inProgressVisits,
                completionRate
            },
            attentionItems = new
            {
                visitsAwaitingReview,
                pendingRegistrations,
                employeesWithNoActivityToday
            }
        });
    }

    // ── Endpoint 2: Today's Visit Progress ──────────────────

    [HttpGet("today-progress")]
    public async Task<IActionResult> GetTodayProgress()
    {
        var (regionId, _) = await GetAdminContext();
        var role = GetRole();
        var todayStart = DateTime.SpecifyKind(DateTime.UtcNow.Date, DateTimeKind.Utc);
        var todayEnd = todayStart.AddDays(1);

        var schedulesQuery = _db.VisitSchedules
            .Include(s => s.Store)
            .Where(s => s.DueDate >= todayStart && s.DueDate < todayEnd);

        if (regionId != null)
            schedulesQuery = schedulesQuery.Where(s => s.Store.RegionId == regionId);

        var allSchedules = await schedulesQuery
            .Select(s => new { s.Status, s.Store.RegionId, s.Store.RegionName })
            .ToListAsync();

        // In-progress visits
        var inProgressQuery = _db.Visits
            .Include(v => v.Store)
            .Where(v => v.Status == VisitStatus.InProgress && v.CheckInTime >= todayStart);
        if (regionId != null)
            inProgressQuery = inProgressQuery.Where(v => v.Store.RegionId == regionId);

        var inProgressList = await inProgressQuery
            .Select(v => new { v.Store.RegionId })
            .ToListAsync();

        var scheduled = allSchedules.Count;
        var completed = allSchedules.Count(s => s.Status == ScheduleStatus.Completed);
        var missed = allSchedules.Count(s => s.Status == ScheduleStatus.Missed);
        var inProgress = inProgressList.Count;
        var remaining = Math.Max(0, scheduled - completed - missed - inProgress);
        var completionRate = scheduled > 0 ? Math.Round((double)completed / scheduled * 100, 1) : 0;

        var overall = new { scheduled, completed, missed, inProgress, remaining, completionRate };

        // By region (SuperAdmin gets all, Admin gets just theirs)
        List<object>? byRegion = null;
        if (role == "SuperAdmin")
        {
            var regionGroups = allSchedules
                .GroupBy(s => new { s.RegionId, s.RegionName })
                .Select(g =>
                {
                    var rScheduled = g.Count();
                    var rCompleted = g.Count(s => s.Status == ScheduleStatus.Completed);
                    var rMissed = g.Count(s => s.Status == ScheduleStatus.Missed);
                    var rInProgress = inProgressList.Count(ip => ip.RegionId == g.Key.RegionId);
                    return new
                    {
                        regionId = g.Key.RegionId,
                        regionName = g.Key.RegionName,
                        scheduled = rScheduled,
                        completed = rCompleted,
                        missed = rMissed,
                        inProgress = rInProgress,
                        completionRate = rScheduled > 0 ? Math.Round((double)rCompleted / rScheduled * 100, 1) : 0
                    };
                })
                .OrderBy(r => r.completionRate)
                .ToList<object>();

            byRegion = regionGroups;
        }

        return Ok(new { overall, byRegion });
    }

    // ── Endpoint 3: Store Coverage ──────────────────────────

    [HttpGet("store-coverage")]
    public async Task<IActionResult> GetStoreCoverage()
    {
        var (regionId, _) = await GetAdminContext();
        var now = DateTime.UtcNow;
        var weekStart = DateTime.SpecifyKind(now.Date.AddDays(-(int)now.DayOfWeek), DateTimeKind.Utc);

        var storesQuery = _db.Stores.AsQueryable();
        if (regionId != null)
            storesQuery = storesQuery.Where(s => s.RegionId == regionId);

        var stores = await storesQuery
            .Select(s => new
            {
                s.Id,
                s.Name,
                s.RegionName,
                LastVisit = s.Visits
                    .Where(v => v.Status == VisitStatus.Completed)
                    .OrderByDescending(v => v.CheckInTime)
                    .Select(v => new { v.CheckInTime, v.User.FullName })
                    .FirstOrDefault(),
                VisitsThisWeek = s.Visits
                    .Count(v => v.CheckInTime >= weekStart && v.Status == VisitStatus.Completed)
            })
            .ToListAsync();

        var result = stores.Select(s =>
        {
            var lastVisitDate = s.LastVisit?.CheckInTime;
            var daysSince = lastVisitDate.HasValue
                ? (int)(now - lastVisitDate.Value).TotalDays
                : (int?)null;

            var coverageStatus = lastVisitDate == null ? "NeverVisited"
                : daysSince <= 7 ? "Good"
                : daysSince <= 14 ? "Warning"
                : "Critical";

            return new
            {
                storeId = s.Id,
                storeName = s.Name,
                regionName = s.RegionName,
                lastVisitDate,
                daysSinceLastVisit = daysSince,
                visitsThisWeek = s.VisitsThisWeek,
                coverageStatus,
                lastVisitEmployeeName = s.LastVisit?.FullName
            };
        })
        .OrderBy(s => s.coverageStatus == "Critical" ? 0 :
                       s.coverageStatus == "Warning" ? 1 :
                       s.coverageStatus == "NeverVisited" ? 2 : 3)
        .ThenBy(s => s.storeName)
        .ToList();

        return Ok(new { stores = result });
    }

    // ── Endpoint 4: Pinned Analytics ────────────────────────

    [HttpGet("pinned-analytics")]
    public async Task<IActionResult> GetPinnedAnalytics()
    {
        var user = await _db.Users.FindAsync(GetUserId());
        var pinned = DeserializePinned(user?.PinnedDashboardWidgets);
        return Ok(new { pinnedWidgets = pinned });
    }

    [HttpPost("pinned-analytics")]
    public async Task<IActionResult> UpdatePinnedAnalytics([FromBody] PinRequest request)
    {
        var user = await _db.Users.FindAsync(GetUserId());
        if (user == null) return NotFound();

        var pinned = DeserializePinned(user.PinnedDashboardWidgets);

        if (request.Action == "pin" && !pinned.Contains(request.WidgetId))
        {
            pinned.Add(request.WidgetId);
        }
        else if (request.Action == "unpin")
        {
            pinned.Remove(request.WidgetId);
        }

        user.PinnedDashboardWidgets = JsonSerializer.Serialize(pinned);
        await _db.SaveChangesAsync();

        return Ok(new { pinnedWidgets = pinned });
    }

    private static List<string> DeserializePinned(string? json)
    {
        if (string.IsNullOrEmpty(json)) return new List<string>();
        try
        {
            return JsonSerializer.Deserialize<List<string>>(json) ?? new List<string>();
        }
        catch
        {
            return new List<string>();
        }
    }

    public record PinRequest(string WidgetId, string Action);
}
