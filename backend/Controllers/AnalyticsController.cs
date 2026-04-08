using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LGSupervisor.Api.Data;
using LGSupervisor.Api.Models;
using LGSupervisor.Api.Models.DTOs;

namespace LGSupervisor.Api.Controllers;

[ApiController]
[Route("api/analytics")]
[Authorize(Roles = "Admin,SuperAdmin")]
public class AnalyticsController : ControllerBase
{
    private readonly AppDbContext _db;

    public AnalyticsController(AppDbContext db)
    {
        _db = db;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private async Task<string?> GetEffectiveRegionId(string? regionIdParam)
    {
        var role = User.FindFirstValue(ClaimTypes.Role);
        if (role == "Admin")
        {
            var user = await _db.Users.FindAsync(GetUserId());
            return user?.RegionId;
        }
        return string.IsNullOrEmpty(regionIdParam) ? null : regionIdParam;
    }

    private static (DateTime from, DateTime to) GetDateRange(DateTime? fromParam, DateTime? toParam)
    {
        var f = fromParam?.Date ?? DateTime.UtcNow.Date.AddDays(-29);
        var t = toParam?.Date.AddDays(1) ?? DateTime.UtcNow.Date.AddDays(1);
        return (DateTime.SpecifyKind(f, DateTimeKind.Utc), DateTime.SpecifyKind(t, DateTimeKind.Utc));
    }

    // ── Old endpoints (kept) ─────────────────────────────

    [HttpGet("overview")]
    public async Task<ActionResult<OverviewStats>> GetOverview(
        [FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null)
    {
        var start = from ?? DateTime.UtcNow.Date.AddDays(-30);
        var end = to ?? DateTime.UtcNow;

        var visits = _db.Visits.Where(v => v.CheckInTime >= start && v.CheckInTime <= end);
        var totalVisits = await visits.CountAsync();
        var completedVisits = await visits.CountAsync(v => v.Status == VisitStatus.Completed);
        var gpsVerified = await visits.CountAsync(v => v.GpsVerified);
        var activeEmployees = await visits.Select(v => v.UserId).Distinct().CountAsync();
        var totalStores = await _db.Stores.CountAsync();
        var visitedStores = await visits.Select(v => v.StoreId).Distinct().CountAsync();

        var totalProducts = await _db.ProductEntries
            .Where(p => p.Visit.CheckInTime >= start && p.Visit.CheckInTime <= end)
            .CountAsync();

        return Ok(new OverviewStats(
            totalVisits, completedVisits, gpsVerified,
            activeEmployees, totalStores, visitedStores,
            totalProducts));
    }

    [HttpGet("employees")]
    public async Task<ActionResult<List<EmployeeStats>>> GetEmployeeStats(
        [FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null)
    {
        var start = from ?? DateTime.UtcNow.Date.AddDays(-30);
        var end = to ?? DateTime.UtcNow;

        var employees = await _db.Users
            .Where(u => u.Role == UserRole.Employee)
            .Include(u => u.Visits)
            .ToListAsync();

        var stats = employees.Select(u =>
        {
            var periodVisits = u.Visits.Where(v => v.CheckInTime >= start && v.CheckInTime <= end).ToList();
            return new EmployeeStats(
                u.Id, u.FullName, u.AvatarUrl,
                periodVisits.Count,
                periodVisits.Count(v => v.Status == VisitStatus.Completed),
                periodVisits.Select(v => v.StoreId).Distinct().Count(),
                periodVisits.Count > 0 ? periodVisits.Max(v => v.CheckInTime) : null
            );
        })
        .OrderByDescending(e => e.TotalVisits)
        .ToList();

        return Ok(stats);
    }

    [HttpGet("stores")]
    public async Task<ActionResult<List<StoreAnalytics>>> GetStoreStats(
        [FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null)
    {
        var start = from ?? DateTime.UtcNow.Date.AddDays(-30);
        var end = to ?? DateTime.UtcNow;

        var stores = await _db.Stores
            .Include(s => s.Visits).ThenInclude(v => v.Products)
            .Include(s => s.AssignedUsers)
            .ToListAsync();

        var stats = stores.Select(s =>
        {
            var periodVisits = s.Visits.Where(v => v.CheckInTime >= start && v.CheckInTime <= end).ToList();
            return new StoreAnalytics(
                s.Id, s.Name, s.City, s.RegionId,
                periodVisits.Count,
                periodVisits.Count(v => v.GpsVerified),
                s.AssignedUsers.Count,
                periodVisits.SelectMany(v => v.Products).Count(),
                periodVisits.Count > 0 ? periodVisits.Max(v => v.CheckInTime) : null
            );
        })
        .OrderByDescending(x => x.TotalVisits)
        .ToList();

        return Ok(stats);
    }

    [HttpGet("brands")]
    public async Task<ActionResult<List<BrandStats>>> GetBrandStats(
        [FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null)
    {
        var start = from ?? DateTime.UtcNow.Date.AddDays(-30);
        var end = to ?? DateTime.UtcNow;

        var products = await _db.ProductEntries
            .Where(p => p.Visit.CheckInTime >= start && p.Visit.CheckInTime <= end)
            .Select(p => new { p.Brand, p.Quantity, p.Price, p.Visit.StoreId })
            .ToListAsync();

        var stats = products
            .GroupBy(p => p.Brand)
            .Select(g => new BrandStats(
                g.Key, g.Count(), g.Sum(p => p.Quantity),
                g.Select(p => p.StoreId).Distinct().Count(),
                Math.Round((double)g.Where(p => p.Price > 0).Select(p => p.Price).DefaultIfEmpty(0).Average(), 2)
            ))
            .OrderByDescending(b => b.TotalEntries)
            .ToList();

        return Ok(stats);
    }

    [HttpGet("daily")]
    public async Task<ActionResult<List<DailyStats>>> GetDailyStats(
        [FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null)
    {
        var start = from ?? DateTime.UtcNow.Date.AddDays(-30);
        var end = to ?? DateTime.UtcNow;

        var visits = await _db.Visits
            .Where(v => v.CheckInTime >= start && v.CheckInTime <= end)
            .Select(v => new { v.CheckInTime, v.Status, v.UserId })
            .ToListAsync();

        var stats = visits
            .GroupBy(v => v.CheckInTime.Date)
            .Select(g => new DailyStats(
                g.Key,
                g.Count(),
                g.Count(v => v.Status == VisitStatus.Completed),
                g.Select(v => v.UserId).Distinct().Count()
            ))
            .OrderBy(d => d.Date)
            .ToList();

        return Ok(stats);
    }

    // ── NEW endpoints ────────────────────────────────────

    [HttpGet("completion-rate")]
    public async Task<IActionResult> GetCompletionRate(
        [FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null,
        [FromQuery] string? regionId = null)
    {
        var (start, end) = GetDateRange(from, to);
        var effectiveRegion = await GetEffectiveRegionId(regionId);

        var schedulesQ = _db.VisitSchedules.Include(s => s.Store)
            .Where(s => s.DueDate >= start && s.DueDate < end);
        if (effectiveRegion != null) schedulesQ = schedulesQ.Where(s => s.Store.RegionId == effectiveRegion);

        var schedules = await schedulesQ.Select(s => new {
            s.Id, s.DueDate, s.Status, s.ActualVisitId, s.Store.RegionId, s.Store.RegionName
        }).ToListAsync();

        var visitsInRange = _db.Visits.Include(v => v.Store)
            .Where(v => v.CheckInTime >= start && v.CheckInTime < end);
        if (effectiveRegion != null) visitsInRange = visitsInRange.Where(v => v.Store.RegionId == effectiveRegion);
        var visitIdSet = (await visitsInRange.Select(v => v.Id).ToListAsync()).ToHashSet();

        var onTimeCount = schedules.Count(s =>
            s.Status == ScheduleStatus.Completed && s.ActualVisitId.HasValue &&
            visitIdSet.Contains(s.ActualVisitId.Value));

        var scheduled = schedules.Count;
        var completed = schedules.Count(s => s.Status == ScheduleStatus.Completed);
        var missed = schedules.Count(s => s.Status == ScheduleStatus.Missed);
        var cancelled = schedules.Count(s => s.Status == ScheduleStatus.Cancelled);
        var completionRate = scheduled > 0 ? Math.Round((double)completed / scheduled * 100, 1) : 0;
        var onTimeRate = scheduled > 0 ? Math.Round((double)onTimeCount / scheduled * 100, 1) : 0;

        var trend = Enumerable.Range(0, (int)(end - start).TotalDays)
            .Select(i => start.AddDays(i))
            .Select(day =>
            {
                var daySchedules = schedules.Where(s => s.DueDate.Date == day.Date).ToList();
                var daySched = daySchedules.Count;
                var dayComp = daySchedules.Count(s => s.Status == ScheduleStatus.Completed);
                var dayMissed = daySchedules.Count(s => s.Status == ScheduleStatus.Missed);
                return new {
                    date = day.ToString("yyyy-MM-dd"),
                    scheduled = daySched,
                    completed = dayComp,
                    missed = dayMissed,
                    completionRate = daySched > 0 ? Math.Round((double)dayComp / daySched * 100, 1) : 0
                };
            }).ToList();

        var role = User.FindFirstValue(ClaimTypes.Role);
        object? byRegion = null;
        if (role == "SuperAdmin" && effectiveRegion == null)
        {
            byRegion = schedules.GroupBy(s => new { s.RegionId, s.RegionName })
                .Select(g => new {
                    regionId = g.Key.RegionId,
                    regionName = g.Key.RegionName,
                    scheduled = g.Count(),
                    completed = g.Count(s => s.Status == ScheduleStatus.Completed),
                    completionRate = g.Count() > 0
                        ? Math.Round((double)g.Count(s => s.Status == ScheduleStatus.Completed) / g.Count() * 100, 1) : 0
                })
                .OrderByDescending(r => r.completionRate)
                .ToList();
        }

        return Ok(new {
            overall = new { scheduled, completed, missed, cancelled, completionRate, onTimeRate },
            trend,
            byRegion
        });
    }

    [HttpGet("employee-leaderboard")]
    public async Task<IActionResult> GetEmployeeLeaderboard(
        [FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null,
        [FromQuery] string? regionId = null)
    {
        var (start, end) = GetDateRange(from, to);
        var effectiveRegion = await GetEffectiveRegionId(regionId);

        var employeesQ = _db.Users.Where(u => u.Role == UserRole.Employee && u.AccountStatus == UserAccountStatus.Active);
        if (effectiveRegion != null) employeesQ = employeesQ.Where(u => u.RegionId == effectiveRegion);

        var employees = await employeesQ.Select(u => new {
            u.Id, u.FullName, u.AvatarUrl, u.RegionName
        }).ToListAsync();

        var employeeIds = employees.Select(e => e.Id).ToHashSet();

        var schedules = await _db.VisitSchedules
            .Where(s => s.DueDate >= start && s.DueDate < end && employeeIds.Contains(s.EmployeeId))
            .Select(s => new { s.EmployeeId, s.Status, s.ActualVisitId, s.DueDate })
            .ToListAsync();

        var visits = await _db.Visits
            .Where(v => v.CheckInTime >= start && v.CheckInTime < end && employeeIds.Contains(v.UserId))
            .Select(v => new { v.Id, v.UserId, v.CheckInTime, v.CheckOutTime, v.ReviewStatus })
            .ToListAsync();

        var result = employees.Select(emp =>
        {
            var empSchedules = schedules.Where(s => s.EmployeeId == emp.Id).ToList();
            var empVisits = visits.Where(v => v.UserId == emp.Id).ToList();

            var totalScheduled = empSchedules.Count;
            var completedSched = empSchedules.Count(s => s.Status == ScheduleStatus.Completed);
            var missedSched = empSchedules.Count(s => s.Status == ScheduleStatus.Missed);
            var approved = empVisits.Count(v => v.ReviewStatus == ReviewStatus.Approved);
            var rejected = empVisits.Count(v => v.ReviewStatus == ReviewStatus.Rejected);
            var completedVisits = empVisits.Count(v => v.CheckOutTime != null);

            var onTime = empSchedules.Count(s =>
                s.Status == ScheduleStatus.Completed && s.ActualVisitId.HasValue &&
                empVisits.Any(v => v.Id == s.ActualVisitId.Value && v.CheckInTime.Date <= s.DueDate.Date));

            var completionRate = totalScheduled > 0 ? Math.Round((double)completedSched / totalScheduled * 100, 1) : 0;
            var approvalRate = completedVisits > 0 ? Math.Round((double)approved / completedVisits * 100, 1) : 0;
            var onTimeRate = completedVisits > 0 ? Math.Round((double)onTime / completedVisits * 100, 1) : 0;

            var avgDuration = empVisits.Where(v => v.CheckOutTime != null)
                .Select(v => (v.CheckOutTime!.Value - v.CheckInTime).TotalMinutes)
                .DefaultIfEmpty(0).Average();

            var score = Math.Round(completionRate * 0.4 + approvalRate * 0.35 + onTimeRate * 0.25, 1);

            return new {
                employeeId = emp.Id,
                employeeName = emp.FullName,
                avatarUrl = emp.AvatarUrl,
                regionName = emp.RegionName ?? "",
                totalScheduled,
                completed = completedSched,
                missed = missedSched,
                approved,
                rejected,
                completionRate,
                approvalRate,
                onTimeRate,
                avgDurationMinutes = (int)Math.Round(avgDuration),
                score
            };
        })
        .OrderByDescending(e => e.score)
        .ToList();

        return Ok(new { employees = result });
    }

    [HttpGet("store-frequency")]
    public async Task<IActionResult> GetStoreFrequency(
        [FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null,
        [FromQuery] string? regionId = null)
    {
        var (start, end) = GetDateRange(from, to);
        var effectiveRegion = await GetEffectiveRegionId(regionId);

        var storesQ = _db.Stores.AsQueryable();
        if (effectiveRegion != null) storesQ = storesQ.Where(s => s.RegionId == effectiveRegion);

        var stores = await storesQ.Select(s => new { s.Id, s.Name, s.RegionName }).ToListAsync();
        var storeIds = stores.Select(s => s.Id).ToHashSet();

        var visits = await _db.Visits.Include(v => v.User)
            .Where(v => storeIds.Contains(v.StoreId))
            .Select(v => new { v.StoreId, v.CheckInTime, EmployeeName = v.User.FullName })
            .ToListAsync();

        var now = DateTime.UtcNow;
        var result = stores.Select(store =>
        {
            var storeVisits = visits.Where(v => v.StoreId == store.Id).OrderByDescending(v => v.CheckInTime).ToList();
            var lastVisit = storeVisits.FirstOrDefault();
            var daysSince = lastVisit != null ? (int)(now - lastVisit.CheckInTime).TotalDays : -1;

            string frequencyStatus;
            if (lastVisit == null) frequencyStatus = "NeverVisited";
            else if (daysSince <= 7) frequencyStatus = "OnSchedule";
            else if (daysSince <= 14) frequencyStatus = "DueSoon";
            else frequencyStatus = "Overdue";

            return new {
                storeId = store.Id,
                storeName = store.Name,
                regionName = store.RegionName,
                totalVisits = storeVisits.Count,
                visitsThisWeek = storeVisits.Count(v => v.CheckInTime >= now.AddDays(-7)),
                visitsThisMonth = storeVisits.Count(v => v.CheckInTime >= now.AddDays(-30)),
                lastVisitDate = lastVisit?.CheckInTime,
                lastVisitEmployeeName = lastVisit?.EmployeeName,
                daysSinceLastVisit = daysSince == -1 ? 999 : daysSince,
                frequencyStatus
            };
        })
        .OrderByDescending(s => s.daysSinceLastVisit)
        .ToList();

        return Ok(new { stores = result });
    }

    [HttpGet("approval-rate")]
    public async Task<IActionResult> GetApprovalRate(
        [FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null,
        [FromQuery] string? regionId = null)
    {
        var (start, end) = GetDateRange(from, to);
        var effectiveRegion = await GetEffectiveRegionId(regionId);

        var visitsQ = _db.Visits.Include(v => v.Store).Include(v => v.User)
            .Where(v => v.Status == VisitStatus.Completed && v.CheckInTime >= start && v.CheckInTime < end);
        if (effectiveRegion != null) visitsQ = visitsQ.Where(v => v.Store.RegionId == effectiveRegion);

        var visits = await visitsQ.Select(v => new {
            v.Id, v.UserId, v.CheckInTime, v.ReviewStatus, v.ReviewComment,
            EmployeeName = v.User.FullName
        }).ToListAsync();

        var approved = visits.Count(v => v.ReviewStatus == ReviewStatus.Approved);
        var rejected = visits.Count(v => v.ReviewStatus == ReviewStatus.Rejected);
        var pending = visits.Count(v => v.ReviewStatus == null);
        var totalReviewed = approved + rejected;
        var approvalRate = totalReviewed > 0 ? Math.Round((double)approved / totalReviewed * 100, 1) : 0;

        var trend = Enumerable.Range(0, (int)(end - start).TotalDays)
            .Select(i => start.AddDays(i))
            .Select(day =>
            {
                var dayVisits = visits.Where(v => v.CheckInTime.Date == day.Date).ToList();
                var dApproved = dayVisits.Count(v => v.ReviewStatus == ReviewStatus.Approved);
                var dRejected = dayVisits.Count(v => v.ReviewStatus == ReviewStatus.Rejected);
                var dTotal = dApproved + dRejected;
                return new {
                    date = day.ToString("yyyy-MM-dd"),
                    approved = dApproved,
                    rejected = dRejected,
                    approvalRate = dTotal > 0 ? Math.Round((double)dApproved / dTotal * 100, 1) : 0
                };
            }).ToList();

        var byEmployee = visits.GroupBy(v => new { v.UserId, v.EmployeeName })
            .Select(g =>
            {
                var ea = g.Count(v => v.ReviewStatus == ReviewStatus.Approved);
                var er = g.Count(v => v.ReviewStatus == ReviewStatus.Rejected);
                var et = ea + er;
                return new {
                    employeeId = g.Key.UserId,
                    employeeName = g.Key.EmployeeName,
                    approved = ea,
                    rejected = er,
                    approvalRate = et > 0 ? Math.Round((double)ea / et * 100, 1) : 0
                };
            })
            .Where(e => e.approved + e.rejected > 0)
            .OrderBy(e => e.approvalRate)
            .ToList();

        var topRejectionReasons = visits
            .Where(v => v.ReviewStatus == ReviewStatus.Rejected && !string.IsNullOrWhiteSpace(v.ReviewComment))
            .GroupBy(v => v.ReviewComment!.Trim())
            .Select(g => new { reason = g.Key, count = g.Count() })
            .OrderByDescending(r => r.count)
            .Take(5)
            .ToList();

        return Ok(new {
            overall = new { totalReviewed, approved, rejected, approvalRate, pendingReview = pending },
            trend,
            byEmployee,
            topRejectionReasons
        });
    }

    [HttpGet("regional-comparison")]
    public async Task<IActionResult> GetRegionalComparison(
        [FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null)
    {
        var role = User.FindFirstValue(ClaimTypes.Role);
        if (role != "SuperAdmin") return Forbid();

        var (start, end) = GetDateRange(from, to);

        var allRegions = new[] {
            ("andijan", "Andijan"), ("bukhara", "Bukhara"), ("fergana", "Fergana"),
            ("jizzakh", "Jizzakh"), ("kashkadarya", "Kashkadarya"), ("khorezm", "Khorezm"),
            ("namangan", "Namangan"), ("navoi", "Navoi"), ("samarkand", "Samarkand"),
            ("sirdaryo", "Sirdaryo"), ("surkhandarya", "Surkhandarya"), ("tashkent", "Tashkent")
        };

        var employees = await _db.Users
            .Where(u => u.Role == UserRole.Employee && u.AccountStatus == UserAccountStatus.Active)
            .Select(u => new { u.Id, u.RegionId }).ToListAsync();

        var stores = await _db.Stores.Select(s => new { s.Id, s.RegionId }).ToListAsync();

        var schedules = await _db.VisitSchedules.Include(s => s.Store)
            .Where(s => s.DueDate >= start && s.DueDate < end)
            .Select(s => new { s.Status, s.ActualVisitId, s.DueDate, RegionId = s.Store.RegionId })
            .ToListAsync();

        var visits = await _db.Visits.Include(v => v.Store)
            .Where(v => v.CheckInTime >= start && v.CheckInTime < end)
            .Select(v => new {
                v.Id, v.UserId, v.CheckInTime, v.CheckOutTime, v.ReviewStatus,
                RegionId = v.Store.RegionId
            }).ToListAsync();

        var result = allRegions.Select(r =>
        {
            var regionEmployees = employees.Where(e => e.RegionId == r.Item1).ToList();
            var regionStores = stores.Where(s => s.RegionId == r.Item1);
            var regionSchedules = schedules.Where(s => s.RegionId == r.Item1).ToList();
            var regionVisits = visits.Where(v => v.RegionId == r.Item1).ToList();

            var activeEmps = regionVisits.Select(v => v.UserId).Distinct().Count();
            var scheduledCount = regionSchedules.Count;
            var completedCount = regionSchedules.Count(s => s.Status == ScheduleStatus.Completed);
            var missedCount = regionSchedules.Count(s => s.Status == ScheduleStatus.Missed);
            var completionRate = scheduledCount > 0 ? Math.Round((double)completedCount / scheduledCount * 100, 1) : 0;

            var reviewed = regionVisits.Where(v => v.ReviewStatus != null).ToList();
            var approvedCount = reviewed.Count(v => v.ReviewStatus == ReviewStatus.Approved);
            var approvalRate = reviewed.Count > 0 ? Math.Round((double)approvedCount / reviewed.Count * 100, 1) : 0;

            var completedVisits = regionVisits.Where(v => v.CheckOutTime != null).ToList();
            var avgDuration = completedVisits.Count > 0
                ? (int)Math.Round(completedVisits.Average(v => (v.CheckOutTime!.Value - v.CheckInTime).TotalMinutes))
                : 0;

            var lastActivity = regionVisits.Count > 0 ? regionVisits.Max(v => v.CheckInTime) : (DateTime?)null;

            return new {
                regionId = r.Item1,
                regionName = r.Item2,
                totalEmployees = regionEmployees.Count,
                activeEmployees = activeEmps,
                totalStores = regionStores.Count(),
                scheduledVisits = scheduledCount,
                completedVisits = completedCount,
                missedVisits = missedCount,
                completionRate,
                approvalRate,
                avgDurationMinutes = avgDuration,
                lastActivityDate = lastActivity
            };
        }).ToList();

        return Ok(new { regions = result });
    }

    [HttpGet("missed-patterns")]
    public async Task<IActionResult> GetMissedPatterns(
        [FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null,
        [FromQuery] string? regionId = null)
    {
        var (start, end) = GetDateRange(from, to);
        var effectiveRegion = await GetEffectiveRegionId(regionId);

        var missedQ = _db.VisitSchedules.Include(s => s.Store).Include(s => s.Employee)
            .Where(s => s.Status == ScheduleStatus.Missed && s.DueDate >= start && s.DueDate < end);
        if (effectiveRegion != null) missedQ = missedQ.Where(s => s.Store.RegionId == effectiveRegion);

        var missed = await missedQ.Select(s => new {
            s.Id, s.DueDate, s.EmployeeId, EmployeeName = s.Employee.FullName,
            EmployeeRegion = s.Employee.RegionName,
            s.StoreId, StoreName = s.Store.Name, StoreRegion = s.Store.RegionName
        }).ToListAsync();

        var allSchedQ = _db.VisitSchedules.Include(s => s.Store)
            .Where(s => s.DueDate >= start && s.DueDate < end);
        if (effectiveRegion != null) allSchedQ = allSchedQ.Where(s => s.Store.RegionId == effectiveRegion);
        var allSchedules = await allSchedQ.Select(s => new { s.EmployeeId, s.StoreId }).ToListAsync();

        var byDayOfWeek = new[] { "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday" }
            .Select(day => new {
                day,
                count = missed.Count(m => m.DueDate.DayOfWeek.ToString() == day)
            }).ToList();

        var topMissingEmployees = missed.GroupBy(m => new { m.EmployeeId, m.EmployeeName, m.EmployeeRegion })
            .Select(g =>
            {
                var totalSched = allSchedules.Count(s => s.EmployeeId == g.Key.EmployeeId);
                return new {
                    employeeId = g.Key.EmployeeId,
                    employeeName = g.Key.EmployeeName,
                    regionName = g.Key.EmployeeRegion ?? "",
                    missedCount = g.Count(),
                    totalScheduled = totalSched,
                    missRate = totalSched > 0 ? Math.Round((double)g.Count() / totalSched * 100, 1) : 0
                };
            })
            .OrderByDescending(e => e.missedCount)
            .Take(5).ToList();

        var topMissedStores = missed.GroupBy(m => new { m.StoreId, m.StoreName, m.StoreRegion })
            .Select(g =>
            {
                var totalSched = allSchedules.Count(s => s.StoreId == g.Key.StoreId);
                return new {
                    storeId = g.Key.StoreId,
                    storeName = g.Key.StoreName,
                    regionName = g.Key.StoreRegion ?? "",
                    missedCount = g.Count(),
                    totalScheduled = totalSched,
                    missRate = totalSched > 0 ? Math.Round((double)g.Count() / totalSched * 100, 1) : 0
                };
            })
            .OrderByDescending(s => s.missedCount)
            .Take(5).ToList();

        var trend = Enumerable.Range(0, (int)(end - start).TotalDays)
            .Select(i => start.AddDays(i))
            .Select(day => new {
                date = day.ToString("yyyy-MM-dd"),
                missed = missed.Count(m => m.DueDate.Date == day.Date)
            }).ToList();

        return Ok(new { totalMissed = missed.Count, byDayOfWeek, topMissingEmployees, topMissedStores, trend });
    }

    [HttpGet("live-feed")]
    public async Task<IActionResult> GetLiveFeed([FromQuery] int limit = 30)
    {
        var effectiveRegion = await GetEffectiveRegionId(null);

        var onlineQ = _db.Visits.Include(v => v.Store).Where(v => v.Status == VisitStatus.InProgress);
        if (effectiveRegion != null) onlineQ = onlineQ.Where(v => v.Store.RegionId == effectiveRegion);
        var onlineEmployees = await onlineQ.Select(v => v.UserId).Distinct().CountAsync();

        var since = DateTime.SpecifyKind(DateTime.UtcNow.AddHours(-48), DateTimeKind.Utc);

        var recentVisitsQ = _db.Visits.Include(v => v.User).Include(v => v.Store)
            .Where(v => v.CheckInTime >= since);
        if (effectiveRegion != null) recentVisitsQ = recentVisitsQ.Where(v => v.Store.RegionId == effectiveRegion);

        var recentVisits = await recentVisitsQ
            .OrderByDescending(v => v.CheckInTime)
            .Take(limit * 2)
            .ToListAsync();

        var events = new List<object>();

        foreach (var v in recentVisits)
        {
            events.Add(new {
                id = v.Id.ToString() + "-checkin",
                type = "CheckIn",
                employeeName = v.User.FullName,
                employeeId = v.UserId,
                storeName = v.Store.Name,
                regionName = v.Store.RegionName,
                timestamp = v.CheckInTime,
                message = $"{v.User.FullName} checked into {v.Store.Name}"
            });

            if (v.CheckOutTime != null)
            {
                events.Add(new {
                    id = v.Id.ToString() + "-complete",
                    type = "VisitCompleted",
                    employeeName = v.User.FullName,
                    employeeId = v.UserId,
                    storeName = v.Store.Name,
                    regionName = v.Store.RegionName,
                    timestamp = v.CheckOutTime.Value,
                    message = $"{v.User.FullName} completed visit at {v.Store.Name}"
                });
            }

            if (v.ReviewStatus == ReviewStatus.Approved)
            {
                events.Add(new {
                    id = v.Id.ToString() + "-approved",
                    type = "VisitApproved",
                    employeeName = v.User.FullName,
                    employeeId = v.UserId,
                    storeName = v.Store.Name,
                    regionName = v.Store.RegionName,
                    timestamp = v.ReviewedAt ?? v.CheckInTime,
                    message = $"Visit by {v.User.FullName} at {v.Store.Name} was approved"
                });
            }
            else if (v.ReviewStatus == ReviewStatus.Rejected)
            {
                events.Add(new {
                    id = v.Id.ToString() + "-rejected",
                    type = "VisitRejected",
                    employeeName = v.User.FullName,
                    employeeId = v.UserId,
                    storeName = v.Store.Name,
                    regionName = v.Store.RegionName,
                    timestamp = v.ReviewedAt ?? v.CheckInTime,
                    message = $"Visit by {v.User.FullName} at {v.Store.Name} was rejected"
                });
            }
        }

        var missedQ = _db.VisitSchedules.Include(s => s.Employee).Include(s => s.Store)
            .Where(s => s.Status == ScheduleStatus.Missed && s.UpdatedAt >= since);
        if (effectiveRegion != null) missedQ = missedQ.Where(s => s.Store.RegionId == effectiveRegion);

        foreach (var s in await missedQ.Take(limit).ToListAsync())
        {
            events.Add(new {
                id = s.Id.ToString() + "-missed",
                type = "ScheduleMissed",
                employeeName = s.Employee.FullName,
                employeeId = s.EmployeeId,
                storeName = s.Store.Name,
                regionName = s.Store.RegionName,
                timestamp = s.UpdatedAt,
                message = $"{s.Employee.FullName} missed scheduled visit to {s.Store.Name}"
            });
        }

        var sorted = events
            .OrderByDescending(e => ((dynamic)e).timestamp)
            .Take(limit)
            .ToList();

        return Ok(new { onlineEmployees, events = sorted });
    }
}
