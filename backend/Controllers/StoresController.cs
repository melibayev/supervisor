using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LGSupervisor.Api.Data;
using LGSupervisor.Api.Models;
using LGSupervisor.Api.Models.DTOs;
using LGSupervisor.Api.Services;

namespace LGSupervisor.Api.Controllers;

[ApiController]
[Route("api/stores")]
[Authorize]
public class StoresController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IAuditService _audit;

    public StoresController(AppDbContext db, IAuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<StoreDto>>> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? city = null,
        [FromQuery] string? search = null,
        [FromQuery] string? region = null)
    {
        var query = _db.Stores.AsQueryable();
        if (!string.IsNullOrEmpty(city)) query = query.Where(s => s.City == city);
        if (!string.IsNullOrEmpty(region) && region != "all") query = query.Where(s => s.RegionId == region);
        if (!string.IsNullOrEmpty(search)) query = query.Where(s => s.Name.Contains(search) || s.Address.Contains(search));

        var total = await query.CountAsync();
        var items = await query
            .OrderBy(s => s.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(s => new StoreDto(s.Id, s.Name, s.Address, s.City, s.Latitude, s.Longitude, s.GeofenceRadius, s.ImageUrl, s.AssignedUsers.Count, s.Visits.Count, s.RegionId, s.RegionName))
            .ToListAsync();

        return Ok(new PagedResult<StoreDto>(items, total, page, pageSize));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<StoreDto>> Get(Guid id)
    {
        var s = await _db.Stores.Include(x => x.AssignedUsers).Include(x => x.Visits).FirstOrDefaultAsync(x => x.Id == id);
        if (s == null) return NotFound();
        return Ok(new StoreDto(s.Id, s.Name, s.Address, s.City, s.Latitude, s.Longitude, s.GeofenceRadius, s.ImageUrl, s.AssignedUsers.Count, s.Visits.Count, s.RegionId, s.RegionName));
    }

    [HttpGet("{id}/detail")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<ActionResult<StoreDetailDto>> GetDetail(Guid id)
    {
        var s = await _db.Stores
            .Include(x => x.AssignedUsers).ThenInclude(us => us.User)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (s == null) return NotFound();

        var totalVisits = await _db.Visits.CountAsync(v => v.StoreId == id);
        var completedVisits = await _db.Visits.CountAsync(v => v.StoreId == id && v.Status == VisitStatus.Completed);
        var inProgressVisits = await _db.Visits.CountAsync(v => v.StoreId == id && v.Status == VisitStatus.InProgress);
        var approvedVisits = await _db.Visits.CountAsync(v => v.StoreId == id && v.ReviewStatus == ReviewStatus.Approved);
        var rejectedVisits = await _db.Visits.CountAsync(v => v.StoreId == id && v.ReviewStatus == ReviewStatus.Rejected);
        var missedSchedules = await _db.VisitSchedules.CountAsync(vs => vs.StoreId == id && vs.Status == ScheduleStatus.Missed);
        var pendingSchedules = await _db.VisitSchedules.CountAsync(vs => vs.StoreId == id && vs.Status == ScheduleStatus.Pending);
        var lastVisitDate = await _db.Visits.Where(v => v.StoreId == id).OrderByDescending(v => v.CheckInTime).Select(v => (DateTime?)v.CheckInTime).FirstOrDefaultAsync();

        var assignedEmployees = s.AssignedUsers.Select(us => new AssignedEmployeeInfo(us.User.Id, us.User.FullName, us.User.Email, us.User.AvatarUrl, us.AssignedAt)).ToList();
        var stats = new StoreDetailStats(totalVisits, completedVisits, inProgressVisits, approvedVisits, rejectedVisits, missedSchedules, pendingSchedules, s.AssignedUsers.Count, lastVisitDate);

        return Ok(new StoreDetailDto(s.Id, s.Name, s.Address, s.City, s.Latitude, s.Longitude, s.GeofenceRadius, s.ImageUrl, s.RegionId, s.RegionName, s.CreatedAt, assignedEmployees, stats));
    }

    [HttpGet("{id}/visits")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<ActionResult<PagedResult<StoreVisitDto>>> GetStoreVisits(
        Guid id,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 10,
        [FromQuery] string? status = null,
        [FromQuery] string? from = null, [FromQuery] string? to = null)
    {
        var storeExists = await _db.Stores.AnyAsync(s => s.Id == id);
        if (!storeExists) return NotFound();

        var query = _db.Visits.Where(v => v.StoreId == id)
            .Include(v => v.User)
            .Include(v => v.Photos)
            .Include(v => v.Products)
            .Include(v => v.ReviewedByAdmin)
            .AsQueryable();

        if (!string.IsNullOrEmpty(status))
        {
            if (Enum.TryParse<VisitStatus>(status, out var vs))
                query = query.Where(v => v.Status == vs);
        }
        if (!string.IsNullOrEmpty(from) && DateTime.TryParse(from, out var df))
            query = query.Where(v => v.CheckInTime >= DateTime.SpecifyKind(df, DateTimeKind.Utc));
        if (!string.IsNullOrEmpty(to) && DateTime.TryParse(to, out var dt))
            query = query.Where(v => v.CheckInTime <= DateTime.SpecifyKind(dt.AddDays(1), DateTimeKind.Utc));

        var total = await query.CountAsync();
        var visits = await query
            .OrderByDescending(v => v.CheckInTime)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var visitIds = visits.Select(v => v.Id).ToList();
        var linkedSchedules = (await _db.VisitSchedules
            .Where(s => s.ActualVisitId != null && visitIds.Contains(s.ActualVisitId.Value))
            .ToListAsync())
            .GroupBy(s => s.ActualVisitId!.Value)
            .ToDictionary(g => g.Key, g => new { g.First().Id, g.First().DueDate });

        var items = visits.Select(v =>
        {
            linkedSchedules.TryGetValue(v.Id, out var schedule);
            return new StoreVisitDto(
                v.Id, v.UserId, v.User?.FullName ?? "", v.User?.AvatarUrl,
                v.CheckInTime, v.CheckOutTime, v.Status.ToString(),
                v.ReviewStatus?.ToString(), v.ReviewedByAdmin?.FullName, v.ReviewedAt,
                v.ReviewComment, v.RequiresRevisit,
                v.Photos.Count, v.Products.Count, v.DistanceFromStore,
                schedule != null ? schedule.Id : null,
                schedule != null ? schedule.DueDate : null);
        }).ToList();

        return Ok(new PagedResult<StoreVisitDto>(items, total, page, pageSize));
    }

    [HttpGet("{id}/schedules")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<ActionResult<PagedResult<StoreScheduleDto>>> GetStoreSchedules(
        Guid id,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 10,
        [FromQuery] string? status = null,
        [FromQuery] string? from = null, [FromQuery] string? to = null)
    {
        var storeExists = await _db.Stores.AnyAsync(s => s.Id == id);
        if (!storeExists) return NotFound();

        var query = _db.VisitSchedules.Where(s => s.StoreId == id)
            .Include(s => s.Employee)
            .Include(s => s.ActualVisit)
            .Include(s => s.CreatedByAdmin)
            .AsQueryable();

        if (!string.IsNullOrEmpty(status))
        {
            if (Enum.TryParse<ScheduleStatus>(status, out var ss))
                query = query.Where(s => s.Status == ss);
        }
        if (!string.IsNullOrEmpty(from) && DateTime.TryParse(from, out var df))
            query = query.Where(s => s.DueDate >= DateTime.SpecifyKind(df, DateTimeKind.Utc));
        if (!string.IsNullOrEmpty(to) && DateTime.TryParse(to, out var dt))
            query = query.Where(s => s.DueDate <= DateTime.SpecifyKind(dt.AddDays(1), DateTimeKind.Utc));

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(s => s.DueDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(s => new StoreScheduleDto(
                s.Id, s.EmployeeId, s.Employee.FullName, s.Employee.AvatarUrl,
                s.DueDate, s.DueTime, s.Status.ToString(), s.AdminNotes,
                s.CreatedByAdmin.FullName, s.CreatedAt,
                s.ActualVisitId, s.ActualVisit != null ? s.ActualVisit.CheckInTime : null))
            .ToListAsync();

        return Ok(new PagedResult<StoreScheduleDto>(items, total, page, pageSize));
    }

    [HttpGet("my")]
    public async Task<ActionResult<List<StoreDto>>> GetMyStores()
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var stores = await _db.UserStores
            .Where(us => us.UserId == userId)
            .Include(us => us.Store).ThenInclude(s => s.Visits)
            .Include(us => us.Store).ThenInclude(s => s.AssignedUsers)
            .Select(us => new StoreDto(us.Store.Id, us.Store.Name, us.Store.Address, us.Store.City,
                us.Store.Latitude, us.Store.Longitude, us.Store.GeofenceRadius,
                us.Store.ImageUrl, us.Store.AssignedUsers.Count, us.Store.Visits.Count, us.Store.RegionId, us.Store.RegionName))
            .ToListAsync();

        return Ok(stores);
    }

    [HttpGet("nearby")]
    public async Task<ActionResult<List<NearbyStoreDto>>> GetNearby(
        [FromQuery] double lat, [FromQuery] double lng, [FromQuery] double radiusKm = 10)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var assigned = await _db.UserStores.Where(us => us.UserId == userId).Select(us => us.StoreId).ToListAsync();
        var stores = await _db.Stores.Where(s => assigned.Contains(s.Id)).ToListAsync();

        var nearby = stores
            .Select(s => new { Store = s, Distance = GeoService.HaversineDistance(lat, lng, s.Latitude, s.Longitude) })
            .Where(x => x.Distance <= radiusKm * 1000)
            .OrderBy(x => x.Distance)
            .Select(x => new NearbyStoreDto(x.Store.Id, x.Store.Name, x.Store.Address, x.Store.City,
                x.Store.Latitude, x.Store.Longitude, x.Store.GeofenceRadius, Math.Round(x.Distance, 1),
                x.Distance <= x.Store.GeofenceRadius, x.Store.RegionId, x.Store.RegionName))
            .ToList();

        return Ok(nearby);
    }

    [HttpGet("{id}/employees")]
    public async Task<ActionResult<List<UserDto>>> GetStoreEmployees(Guid id)
    {
        var store = await _db.Stores.FindAsync(id);
        if (store == null) return NotFound();

        var employees = await _db.UserStores
            .Where(us => us.StoreId == id)
            .Include(us => us.User)
            .Select(us => new UserDto(us.User.Id, us.User.FullName, us.User.Email, us.User.PhoneNumber,
                us.User.Role.ToString(), us.User.AvatarUrl, us.User.CreatedAt, us.User.LastLoginAt,
                us.User.RegionId, us.User.RegionName, us.User.AccountStatus.ToString()))
            .ToListAsync();

        return Ok(employees);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<ActionResult<StoreDto>> Create([FromBody] CreateStoreRequest req)
    {
        var store = new Store
        {
            Name = req.Name,
            Address = req.Address,
            City = req.City,
            Latitude = req.Latitude,
            Longitude = req.Longitude,
            GeofenceRadius = req.GeofenceRadius,
            RegionId = req.RegionId,
            RegionName = req.RegionName
        };

        _db.Stores.Add(store);
        await _db.SaveChangesAsync();
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        await _audit.LogAsync(userId, "CreateStore", "Store", store.Id.ToString(), null, new { store.Name, store.City, store.RegionId }, GetIp());

        return Created($"/api/stores/{store.Id}",
            new StoreDto(store.Id, store.Name, store.Address, store.City, store.Latitude, store.Longitude, store.GeofenceRadius, store.ImageUrl, 0, 0, store.RegionId, store.RegionName));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateStoreRequest req)
    {
        var store = await _db.Stores.FindAsync(id);
        if (store == null) return NotFound();

        var old = new { store.Name, store.Address, store.City, store.GeofenceRadius, store.RegionId };
        store.Name = req.Name;
        store.Address = req.Address;
        store.City = req.City;
        store.Latitude = req.Latitude;
        store.Longitude = req.Longitude;
        store.GeofenceRadius = req.GeofenceRadius;
        store.RegionId = req.RegionId;
        store.RegionName = req.RegionName;

        await _db.SaveChangesAsync();
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        await _audit.LogAsync(userId, "UpdateStore", "Store", id.ToString(), old, req, GetIp());

        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var store = await _db.Stores.FindAsync(id);
        if (store == null) return NotFound();

        // Remove related data
        var userStores = await _db.UserStores.Where(us => us.StoreId == id).ToListAsync();
        _db.UserStores.RemoveRange(userStores);

        _db.Stores.Remove(store);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    private string GetIp() => HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
}
