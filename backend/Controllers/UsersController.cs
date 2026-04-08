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
[Route("api/users")]
[Authorize(Roles = "Admin,SuperAdmin")]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IAuditService _audit;
    private readonly INotificationService _notifications;

    public UsersController(AppDbContext db, IAuditService audit, INotificationService notifications)
    {
        _db = db;
        _audit = audit;
        _notifications = notifications;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<UserDto>>> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? role = null,
        [FromQuery] string? search = null,
        [FromQuery] string? region = null)
    {
        var query = _db.Users.Where(u => u.AccountStatus == UserAccountStatus.Active).AsQueryable();
        if (!string.IsNullOrEmpty(role) && Enum.TryParse<UserRole>(role, out var r))
            query = query.Where(u => u.Role == r);
        if (!string.IsNullOrEmpty(region) && region != "all") query = query.Where(u => u.RegionId == region);
        if (!string.IsNullOrEmpty(search))
            query = query.Where(u => u.FullName.Contains(search) || u.Email.Contains(search));

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(u => u.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new UserDto(u.Id, u.FullName, u.Email, u.PhoneNumber, u.Role.ToString(), u.AvatarUrl, u.CreatedAt, u.LastLoginAt, u.RegionId, u.RegionName, u.AccountStatus.ToString()))
            .ToListAsync();

        return Ok(new PagedResult<UserDto>(items, total, page, pageSize));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult> Get(Guid id)
    {
        var u = await _db.Users
            .Include(u => u.AssignedStores).ThenInclude(us => us.Store)
            .FirstOrDefaultAsync(u => u.Id == id);
        if (u == null) return NotFound();

        var totalVisits = await _db.Visits.CountAsync(v => v.UserId == id);
        var completedVisits = await _db.Visits.CountAsync(v => v.UserId == id && v.Status == VisitStatus.Completed);
        var approvedVisits = await _db.Visits.CountAsync(v => v.UserId == id && v.ReviewStatus == ReviewStatus.Approved);
        var rejectedVisits = await _db.Visits.CountAsync(v => v.UserId == id && v.ReviewStatus == ReviewStatus.Rejected);
        var missedVisits = await _db.VisitSchedules.CountAsync(s => s.EmployeeId == id && s.Status == ScheduleStatus.Missed);
        var pendingSchedules = await _db.VisitSchedules.CountAsync(s => s.EmployeeId == id && s.Status == ScheduleStatus.Pending);
        var lastVisitDate = await _db.Visits.Where(v => v.UserId == id).OrderByDescending(v => v.CheckInTime).Select(v => (DateTime?)v.CheckInTime).FirstOrDefaultAsync();

        var assignedStores = u.AssignedStores.Select(us => new AssignedStoreInfo(us.Store.Id, us.Store.Name, us.Store.Address, us.Store.RegionName)).ToList();
        var stats = new EmployeeDetailStats(totalVisits, completedVisits, missedVisits, pendingSchedules, approvedVisits, rejectedVisits, lastVisitDate);

        return Ok(new EmployeeDetailDto(u.Id, u.FullName, u.Email, u.PhoneNumber, u.Role.ToString(), u.AvatarUrl, u.CreatedAt, u.LastLoginAt, u.RegionId, u.RegionName, u.AccountStatus.ToString(), assignedStores, stats));
    }

    [HttpGet("{id}/visits")]
    public async Task<ActionResult<PagedResult<EmployeeVisitDto>>> GetEmployeeVisits(
        Guid id,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 10,
        [FromQuery] string? status = null,
        [FromQuery] string? from = null, [FromQuery] string? to = null)
    {
        var userExists = await _db.Users.AnyAsync(u => u.Id == id);
        if (!userExists) return NotFound();

        var query = _db.Visits.Where(v => v.UserId == id)
            .Include(v => v.Store)
            .Include(v => v.Photos)
            .Include(v => v.Products)
            .Include(v => v.ReviewedByAdmin)
            .AsQueryable();

        if (!string.IsNullOrEmpty(status))
        {
            if (status == "Missed")
            {
                // Missed = schedule missed, not a visit status; skip visit filter
                query = query.Where(v => false); // no visits match "Missed" status
            }
            else if (Enum.TryParse<VisitStatus>(status, out var vs))
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

        // Look up linked schedules for these visits (use GroupBy to handle duplicates)
        var visitIds = visits.Select(v => v.Id).ToList();
        var linkedSchedules = (await _db.VisitSchedules
            .Where(s => s.ActualVisitId != null && visitIds.Contains(s.ActualVisitId.Value))
            .ToListAsync())
            .GroupBy(s => s.ActualVisitId!.Value)
            .ToDictionary(g => g.Key, g => new { g.First().Id, g.First().DueDate });

        var items = visits.Select(v =>
        {
            linkedSchedules.TryGetValue(v.Id, out var schedule);
            return new EmployeeVisitDto(
                v.Id, v.StoreId, v.Store?.Name ?? "", v.Store?.Address ?? "", v.Store?.RegionName,
                v.CheckInTime, v.CheckOutTime, v.Status.ToString(),
                v.ReviewStatus?.ToString(), v.ReviewedByAdmin?.FullName, v.ReviewedAt,
                v.ReviewComment, v.RequiresRevisit,
                v.Photos.Count, v.Products.Count, v.DistanceFromStore,
                schedule?.Id, schedule?.DueDate);
        }).ToList();

        return Ok(new PagedResult<EmployeeVisitDto>(items, total, page, pageSize));
    }

    [HttpGet("{id}/schedules")]
    public async Task<ActionResult<PagedResult<EmployeeScheduleDto>>> GetEmployeeSchedules(
        Guid id,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 10,
        [FromQuery] string? status = null,
        [FromQuery] string? from = null, [FromQuery] string? to = null)
    {
        var userExists = await _db.Users.AnyAsync(u => u.Id == id);
        if (!userExists) return NotFound();

        var query = _db.VisitSchedules.Where(s => s.EmployeeId == id)
            .Include(s => s.Store)
            .Include(s => s.CreatedByAdmin)
            .Include(s => s.ActualVisit)
            .AsQueryable();

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<ScheduleStatus>(status, out var ss))
            query = query.Where(s => s.Status == ss);
        if (!string.IsNullOrEmpty(from) && DateTime.TryParse(from, out var sf))
            query = query.Where(s => s.DueDate >= DateTime.SpecifyKind(sf, DateTimeKind.Utc));
        if (!string.IsNullOrEmpty(to) && DateTime.TryParse(to, out var st))
            query = query.Where(s => s.DueDate <= DateTime.SpecifyKind(st.AddDays(1), DateTimeKind.Utc));

        var total = await query.CountAsync();
        var schedules = await query
            .OrderByDescending(s => s.DueDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(s => new EmployeeScheduleDto(
                s.Id, s.StoreId, s.Store.Name, s.Store.Address, s.Store.RegionName,
                s.DueDate, s.DueTime, s.Status.ToString(), s.AdminNotes,
                s.CreatedByAdmin.FullName, s.CreatedAt,
                s.ActualVisitId, s.ActualVisit != null ? s.ActualVisit.CheckInTime : (DateTime?)null))
            .ToListAsync();

        return Ok(new PagedResult<EmployeeScheduleDto>(schedules, total, page, pageSize));
    }

    [HttpPost]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<ActionResult<UserDto>> Create([FromBody] CreateUserRequest req)
    {
        if (await _db.Users.AnyAsync(u => u.Email == req.Email))
            return Conflict(new { message = "Email already exists" });

        if (!Enum.TryParse<UserRole>(req.Role, out var role))
            return BadRequest(new { message = "Invalid role" });

        using var sha = System.Security.Cryptography.SHA256.Create();
        var hash = Convert.ToBase64String(sha.ComputeHash(System.Text.Encoding.UTF8.GetBytes(req.Password)));

        var user = new User
        {
            FullName = req.FullName,
            Email = req.Email,
            PhoneNumber = req.PhoneNumber,
            PasswordHash = hash,
            Role = role,
            RegionId = req.RegionId,
            RegionName = req.RegionName
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(GetUserId(), "CreateUser", "User", user.Id.ToString(), null, new { user.FullName, user.Email, user.Role, user.RegionId }, GetIp());

        return Created($"/api/users/{user.Id}", new UserDto(user.Id, user.FullName, user.Email, user.PhoneNumber, user.Role.ToString(), user.AvatarUrl, user.CreatedAt, user.LastLoginAt, user.RegionId, user.RegionName, user.AccountStatus.ToString()));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateUserRequest req)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();

        var old = new { user.FullName, user.Email, user.PhoneNumber, Role = user.Role.ToString(), user.RegionId };
        var regionChanged = req.RegionId != null && req.RegionId != user.RegionId;
        user.FullName = req.FullName;
        user.Email = req.Email;
        user.PhoneNumber = req.PhoneNumber;
        if (Enum.TryParse<UserRole>(req.Role, out var role)) user.Role = role;
        user.RegionId = req.RegionId;
        user.RegionName = req.RegionName;

        // If region changed, remove store assignments (stores are region-locked)
        if (regionChanged)
        {
            var assignments = await _db.UserStores.Where(us => us.UserId == id).ToListAsync();
            _db.UserStores.RemoveRange(assignments);
        }

        await _db.SaveChangesAsync();
        await _audit.LogAsync(GetUserId(), "UpdateUser", "User", id.ToString(), old, req, GetIp());

        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();

        // Remove related data
        var userStores = await _db.UserStores.Where(us => us.UserId == id).ToListAsync();
        _db.UserStores.RemoveRange(userStores);

        _db.Users.Remove(user);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(GetUserId(), "DeleteUser", "User", id.ToString(), null, null, GetIp());

        return NoContent();
    }

    [HttpPut("{id}/role")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> ChangeRole(Guid id, [FromBody] ChangeRoleRequest req)
    {
        if (!Enum.TryParse<UserRole>(req.Role, out var role))
            return BadRequest(new { message = "Invalid role" });

        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();

        var oldRole = user.Role.ToString();
        user.Role = role;
        await _db.SaveChangesAsync();
        await _audit.LogAsync(GetUserId(), "ChangeRole", "User", id.ToString(), new { Role = oldRole }, new { Role = req.Role }, GetIp());

        return NoContent();
    }

    [HttpPut("{id}/reset-password")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> ResetPassword(Guid id, [FromBody] ResetPasswordRequest req)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();

        using var sha = System.Security.Cryptography.SHA256.Create();
        user.PasswordHash = Convert.ToBase64String(sha.ComputeHash(System.Text.Encoding.UTF8.GetBytes(req.NewPassword)));
        user.RefreshToken = null;
        await _db.SaveChangesAsync();
        await _audit.LogAsync(GetUserId(), "ResetPassword", "User", id.ToString(), null, null, GetIp());

        return NoContent();
    }

    [HttpGet("{id}/stores")]
    public async Task<ActionResult<List<StoreDto>>> GetAssignedStores(Guid id)
    {
        var stores = await _db.UserStores
            .Where(us => us.UserId == id)
            .Include(us => us.Store)
            .Select(us => new StoreDto(us.Store.Id, us.Store.Name, us.Store.Address, us.Store.City,
                us.Store.Latitude, us.Store.Longitude, us.Store.GeofenceRadius,
                us.Store.ImageUrl, us.Store.AssignedUsers.Count, us.Store.Visits.Count, us.Store.RegionId, us.Store.RegionName))
            .ToListAsync();

        return Ok(stores);
    }

    [HttpPost("{userId}/stores/{storeId}")]
    public async Task<IActionResult> AssignStore(Guid userId, Guid storeId, [FromBody] AssignStoreRequest? req = null)
    {
        if (await _db.UserStores.AnyAsync(us => us.UserId == userId && us.StoreId == storeId))
            return Conflict(new { message = "Already assigned" });

        var user = await _db.Users.FindAsync(userId);
        var store = await _db.Stores.FindAsync(storeId);
        if (user == null || store == null) return NotFound();

        // Region-locked: employee must be in the same region as the store
        if (user.RegionId != null && user.RegionId != store.RegionId)
            return BadRequest(new { message = $"Region mismatch: employee is in '{user.RegionName}' but store is in '{store.RegionName}'" });

        _db.UserStores.Add(new UserStore { UserId = userId, StoreId = storeId });

        var adminId = GetUserId();

        // If a due date is provided, auto-create a pending visit schedule
        if (req?.DueDate.HasValue == true)
        {
            var schedule = new VisitSchedule
            {
                EmployeeId = userId,
                StoreId = storeId,
                DueDate = DateTime.SpecifyKind(req.DueDate.Value.Date, DateTimeKind.Utc),
                DueTime = req.DueTime,
                CreatedByAdminId = adminId
            };
            _db.VisitSchedules.Add(schedule);
            await _db.SaveChangesAsync();

            await _audit.LogAsync(adminId, "AssignStore", "UserStore", null, null, new { userId, storeId, dueDate = req.DueDate }, GetIp());
            await _audit.LogAsync(adminId, nameof(AuditAction.ScheduleCreated), "VisitSchedule", schedule.Id.ToString(), null,
                new { userId, storeId, req.DueDate }, GetIp(),
                store.Name, $"Scheduled {user.FullName} to visit {store.Name} on {req.DueDate.Value:MMM d}", store.RegionId);

            await _notifications.CreateAndSendAsync(new Notification
            {
                RecipientId = userId,
                Type = NotificationType.ScheduleCreated,
                Title = "New Visit Scheduled 📅",
                Body = $"You have a visit to {store.Name} on {req.DueDate.Value:MMM d}",
                RelatedEntityId = schedule.Id.ToString(),
                RelatedEntityType = "VisitSchedule",
                ActionUrl = "/dashboard",
                MetadataJson = JsonSerializer.Serialize(new { storeName = store.Name, date = req.DueDate.Value.ToString("MMM d") })
            });
        }
        else
        {
            await _db.SaveChangesAsync();
            await _audit.LogAsync(adminId, "AssignStore", "UserStore", null, null, new { userId, storeId }, GetIp());
        }

        return NoContent();
    }

    [HttpDelete("{userId}/stores/{storeId}")]
    public async Task<IActionResult> UnassignStore(Guid userId, Guid storeId)
    {
        var us = await _db.UserStores.FirstOrDefaultAsync(x => x.UserId == userId && x.StoreId == storeId);
        if (us == null) return NotFound();

        _db.UserStores.Remove(us);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string GetIp() => HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    private UserRole GetUserRole() => Enum.Parse<UserRole>(User.FindFirstValue(ClaimTypes.Role)!);
    private string? GetUserRegionId()
    {
        var userId = GetUserId();
        return _db.Users.Where(u => u.Id == userId).Select(u => u.RegionId).FirstOrDefault();
    }

    [HttpGet("pending")]
    public async Task<ActionResult<PagedResult<PendingUserDto>>> GetPendingUsers(
        [FromQuery] string? regionId = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var query = _db.Users.Where(u => u.AccountStatus == UserAccountStatus.Pending);

        var role = GetUserRole();
        if (role == UserRole.Admin)
        {
            var myRegion = GetUserRegionId();
            query = query.Where(u => u.RegionId == myRegion);
        }
        else if (!string.IsNullOrEmpty(regionId) && regionId != "all")
        {
            query = query.Where(u => u.RegionId == regionId);
        }

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(u => u.RegistrationRequestedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new PendingUserDto(u.Id, u.FullName, u.Email, u.PhoneNumber, u.RegionId, u.RegionName, u.RegistrationRequestedAt))
            .ToListAsync();

        return Ok(new PagedResult<PendingUserDto>(items, total, page, pageSize));
    }

    [HttpGet("pending/count")]
    public async Task<IActionResult> GetPendingCount()
    {
        var query = _db.Users.Where(u => u.AccountStatus == UserAccountStatus.Pending);

        var role = GetUserRole();
        if (role == UserRole.Admin)
        {
            var myRegion = GetUserRegionId();
            query = query.Where(u => u.RegionId == myRegion);
        }

        var count = await query.CountAsync();
        return Ok(new { count });
    }

    [HttpPost("{id}/approve")]
    public async Task<IActionResult> ApproveUser(Guid id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();
        if (user.AccountStatus != UserAccountStatus.Pending)
            return BadRequest(new { message = "User is not in pending status." });

        var adminId = GetUserId();
        user.AccountStatus = UserAccountStatus.Active;
        user.ReviewedByAdminId = adminId;
        user.ReviewedAt = DateTime.UtcNow;
        user.RejectionReason = null;
        await _db.SaveChangesAsync();

        await _notifications.CreateAndSendAsync(new Notification
        {
            RecipientId = user.Id,
            Type = NotificationType.RegistrationApproved,
            Title = "Account Approved ✅",
            Body = "Your registration has been approved! You can now log in.",
            ActionUrl = "/login",            MetadataJson = JsonSerializer.Serialize(new { })        });

        await _audit.LogAsync(adminId, "UserApproved", "User", id.ToString(), null, new { user.FullName }, GetIp(), user.FullName, $"Registration approved for {user.FullName}", user.RegionId);

        return Ok(new { message = "User approved successfully." });
    }

    [HttpPost("{id}/reject")]
    public async Task<IActionResult> RejectUser(Guid id, [FromBody] RejectUserRequest req)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();
        if (user.AccountStatus != UserAccountStatus.Pending)
            return BadRequest(new { message = "User is not in pending status." });

        var adminId = GetUserId();
        user.AccountStatus = UserAccountStatus.Rejected;
        user.ReviewedByAdminId = adminId;
        user.ReviewedAt = DateTime.UtcNow;
        user.RejectionReason = req.Reason;
        await _db.SaveChangesAsync();

        await _notifications.CreateAndSendAsync(new Notification
        {
            RecipientId = user.Id,
            Type = NotificationType.RegistrationRejected,
            Title = "Registration Not Approved",
            Body = $"Your registration was not approved. Reason: {req.Reason}",
            MetadataJson = JsonSerializer.Serialize(new { reason = req.Reason })
        });

        await _audit.LogAsync(adminId, "UserRejected", "User", id.ToString(), null, new { user.FullName, req.Reason }, GetIp(), user.FullName, $"Registration rejected for {user.FullName}. Reason: {req.Reason}", user.RegionId);

        return Ok(new { message = "User rejected." });
    }
}
