using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using LGSupervisor.Api.Data;
using LGSupervisor.Api.Hubs;
using LGSupervisor.Api.Models;
using LGSupervisor.Api.Models.DTOs;
using LGSupervisor.Api.Services;

namespace LGSupervisor.Api.Controllers;

[ApiController]
[Route("api/visits")]
[Authorize]
public class VisitsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IAuditService _audit;
    private readonly IHubContext<VisitHub, IVisitHubClient> _hub;
    private readonly IWebHostEnvironment _env;
    private readonly INotificationService _notifications;

    public VisitsController(AppDbContext db, IAuditService audit, IHubContext<VisitHub, IVisitHubClient> hub, IWebHostEnvironment env, INotificationService notifications)
    {
        _db = db;
        _audit = audit;
        _hub = hub;
        _env = env;
        _notifications = notifications;
    }

    [HttpGet]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<ActionResult<PagedResult<VisitDto>>> GetAll(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20,
        [FromQuery] Guid? userId = null, [FromQuery] Guid? storeId = null,
        [FromQuery] string? status = null, [FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null,
        [FromQuery] string? reviewStatus = null, [FromQuery] string? regionId = null)
    {
        var q = _db.Visits.Include(v => v.User).Include(v => v.Store).Include(v => v.Photos).Include(v => v.Products).Include(v => v.ReviewedByAdmin).AsQueryable();
        if (userId.HasValue) q = q.Where(v => v.UserId == userId);
        if (storeId.HasValue) q = q.Where(v => v.StoreId == storeId);
        if (!string.IsNullOrEmpty(regionId)) q = q.Where(v => v.Store.RegionId == regionId);
        if (!string.IsNullOrEmpty(status) && Enum.TryParse<VisitStatus>(status, out var s))
            q = q.Where(v => v.Status == s);
        if (from.HasValue) { var fromUtc = DateTime.SpecifyKind(from.Value.Date, DateTimeKind.Utc); q = q.Where(v => v.CheckInTime >= fromUtc); }
        if (to.HasValue) { var toUtc = DateTime.SpecifyKind(to.Value.Date.AddDays(1), DateTimeKind.Utc); q = q.Where(v => v.CheckInTime < toUtc); }
        if (!string.IsNullOrEmpty(reviewStatus))
        {
            if (reviewStatus == "NotReviewed")
                q = q.Where(v => v.ReviewStatus == null && v.Status == VisitStatus.Completed);
            else if (Enum.TryParse<ReviewStatus>(reviewStatus, out var rs))
                q = q.Where(v => v.ReviewStatus == rs);
        }

        var total = await q.CountAsync();
        var items = await q.OrderByDescending(v => v.CheckInTime)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(v => MapVisit(v)).ToListAsync();

        return Ok(new PagedResult<VisitDto>(items, total, page, pageSize));
    }

    [HttpGet("my")]
    public async Task<ActionResult<PagedResult<VisitDto>>> GetMyVisits(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var uid = GetUserId();
        var q = _db.Visits.Include(v => v.User).Include(v => v.Store).Include(v => v.Photos).Include(v => v.Products)
            .Where(v => v.UserId == uid);

        var total = await q.CountAsync();
        var items = await q.OrderByDescending(v => v.CheckInTime)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(v => MapVisit(v)).ToListAsync();

        return Ok(new PagedResult<VisitDto>(items, total, page, pageSize));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<VisitDto>> Get(Guid id)
    {
        var v = await _db.Visits.Include(v => v.User).Include(v => v.Store).Include(v => v.Photos).Include(v => v.Products)
            .FirstOrDefaultAsync(v => v.Id == id);
        if (v == null) return NotFound();

        var uid = GetUserId();
        var role = User.FindFirstValue(ClaimTypes.Role);
        if (v.UserId != uid && role == "Employee") return Forbid();

        return Ok(MapVisit(v));
    }

    [HttpPost("start")]
    public async Task<ActionResult<VisitDto>> StartVisit([FromBody] StartVisitRequest req)
    {
        var uid = GetUserId();
        var store = await _db.Stores.FindAsync(req.StoreId);
        if (store == null) return NotFound(new { message = "Store not found" });

        var assigned = await _db.UserStores.AnyAsync(us => us.UserId == uid && us.StoreId == req.StoreId);
        if (!assigned) return Forbid();

        var active = await _db.Visits.AnyAsync(v => v.UserId == uid && v.Status == VisitStatus.InProgress);
        if (active) return Conflict(new { message = "You already have an active visit" });

        var verification = GeoService.Verify(req.Latitude, req.Longitude, store.Latitude, store.Longitude, store.GeofenceRadius);

        if (!verification.IsVerified)
            return BadRequest(new { message = $"You are {verification.Distance:F0}m from the store. You must be within {store.GeofenceRadius}m to start a visit. Please go to the store and update your location." });

        var visit = new Visit
        {
            UserId = uid,
            StoreId = req.StoreId,
            CheckInTime = DateTime.UtcNow,
            CheckInLatitude = req.Latitude,
            CheckInLongitude = req.Longitude,
            DistanceFromStore = verification.Distance,
            GpsVerified = verification.IsVerified,
            Status = VisitStatus.InProgress,
            Notes = (string?)null
        };

        _db.Visits.Add(visit);
        await _db.SaveChangesAsync();

        // Auto-link to schedule if exists (prefer today's, then nearest due date)
        var schedule = await _db.VisitSchedules
            .Where(s =>
                s.EmployeeId == uid &&
                s.StoreId == req.StoreId &&
                s.Status == ScheduleStatus.Pending)
            .OrderBy(s => Math.Abs((s.DueDate.Date - DateTime.UtcNow.Date).TotalDays))
            .FirstOrDefaultAsync();

        if (schedule != null)
        {
            schedule.ActualVisitId = visit.Id;
            schedule.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }

        var user = await _db.Users.FindAsync(uid);
        await _hub.Clients.Group("Admins").VisitStarted(new LiveFeedItem(
            visit.Id, uid, user!.FullName, user.AvatarUrl, store.Id, store.Name,
            "CheckIn", visit.CheckInTime, visit.GpsVerified, visit.DistanceFromStore, null));

        var result = await _db.Visits.Include(v => v.User).Include(v => v.Store).Include(v => v.Photos).Include(v => v.Products)
            .FirstAsync(v => v.Id == visit.Id);
        return Created($"/api/visits/{visit.Id}", MapVisit(result));
    }

    [HttpPost("{id}/checkout")]
    public async Task<ActionResult<VisitDto>> CheckOut(Guid id, [FromBody] CheckOutRequest req)
    {
        var uid = GetUserId();
        var visit = await _db.Visits.Include(v => v.Products).FirstOrDefaultAsync(v => v.Id == id);
        if (visit == null) return NotFound();
        if (visit.UserId != uid) return Forbid();
        if (visit.Status != VisitStatus.InProgress) return BadRequest(new { message = "Visit not in progress" });

        visit.CheckOutTime = DateTime.UtcNow;
        visit.CheckOutLatitude = req.Latitude;
        visit.CheckOutLongitude = req.Longitude;
        visit.Notes = req.Notes;
        visit.Status = VisitStatus.Completed;

        // Unassign store from employee after completion
        var userStore = await _db.UserStores.FirstOrDefaultAsync(us => us.UserId == uid && us.StoreId == visit.StoreId);
        if (userStore != null) _db.UserStores.Remove(userStore);

        // Mark schedule as completed — find one linked at start, or any remaining pending
        var linkedSchedule = await _db.VisitSchedules
            .FirstOrDefaultAsync(s =>
                s.EmployeeId == uid &&
                s.StoreId == visit.StoreId &&
                (s.ActualVisitId == visit.Id || s.Status == ScheduleStatus.Pending));

        if (linkedSchedule != null)
        {
            linkedSchedule.ActualVisitId = visit.Id;
            linkedSchedule.Status = ScheduleStatus.Completed;
            linkedSchedule.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();

        var user = await _db.Users.FindAsync(uid);
        var store = await _db.Stores.FindAsync(visit.StoreId);
        await _hub.Clients.Group("Admins").VisitCompleted(new LiveFeedItem(
            visit.Id, uid, user!.FullName, user.AvatarUrl, store!.Id, store.Name,
            "CheckOut", visit.CheckOutTime.Value, visit.GpsVerified, visit.DistanceFromStore, null));

        var result = await _db.Visits.Include(v => v.User).Include(v => v.Store).Include(v => v.Photos).Include(v => v.Products)
            .FirstAsync(v => v.Id == visit.Id);
        
        // Notify admins about new visit submission
        var regionAdmins = await _db.Users
            .Where(u => (u.Role == UserRole.Admin || u.Role == UserRole.SuperAdmin) &&
                        (u.RegionId == null || u.RegionId == store!.RegionId))
            .Select(u => u.Id).ToListAsync();
        foreach (var adminId in regionAdmins)
        {
            await _notifications.CreateAndSendAsync(new Notification
            {
                RecipientId = adminId,
                Type = NotificationType.VisitSubmitted,
                Title = "New Visit Submitted",
                Body = $"{user!.FullName} completed visit at {store!.Name}",
                RelatedEntityId = visit.Id.ToString(),
                RelatedEntityType = "Visit",
                ActionUrl = $"/visit/{visit.Id}",
                MetadataJson = JsonSerializer.Serialize(new { employeeName = user!.FullName, storeName = store!.Name })
            });
        }

        return Ok(MapVisit(result));
    }

    [HttpPost("{id}/photos")]
    public async Task<ActionResult<VisitPhotoDto>> UploadPhoto(Guid id, [FromForm] UploadPhotoRequest req)
    {
        var uid = GetUserId();
        var visit = await _db.Visits.FindAsync(id);
        if (visit == null) return NotFound();
        if (visit.UserId != uid) return Forbid();

        if (req.File == null || req.File.Length == 0)
            return BadRequest(new { message = "No file provided" });

        if (req.File.Length > 10 * 1024 * 1024)
            return BadRequest(new { message = "File too large (max 10MB)" });

        var allowedTypes = new[] { "image/jpeg", "image/png", "image/webp" };
        if (!allowedTypes.Contains(req.File.ContentType))
            return BadRequest(new { message = "Invalid file type" });

        var uploadsDir = Path.Combine(_env.ContentRootPath, "uploads", id.ToString());
        Directory.CreateDirectory(uploadsDir);

        var fileName = $"{Guid.NewGuid()}{Path.GetExtension(req.File.FileName)}";
        var filePath = Path.Combine(uploadsDir, fileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
            await req.File.CopyToAsync(stream);

        if (!Enum.TryParse<PhotoType>(req.Type, out var photoType))
            photoType = PhotoType.General;

        var photo = new VisitPhoto
        {
            VisitId = id,
            PhotoUrl = $"/uploads/{id}/{fileName}",
            ThumbnailUrl = $"/uploads/{id}/{fileName}",
            Type = photoType,
            CapturedAt = DateTime.UtcNow,
            Latitude = req.Latitude,
            Longitude = req.Longitude,
            Caption = req.Caption
        };

        _db.VisitPhotos.Add(photo);
        await _db.SaveChangesAsync();

        var user = await _db.Users.FindAsync(uid);
        var store = await _db.Stores.FindAsync(visit.StoreId);
        await _hub.Clients.Group("Admins").PhotoUploaded(new LiveFeedItem(
            visit.Id, uid, user!.FullName, user.AvatarUrl, store!.Id, store.Name,
            "Photo", photo.CapturedAt, visit.GpsVerified, visit.DistanceFromStore, photo.PhotoUrl));

        return Created($"/api/visits/{id}/photos/{photo.Id}",
            new VisitPhotoDto(photo.Id, photo.PhotoUrl, photo.ThumbnailUrl, photo.Type.ToString(), photo.CapturedAt, photo.Latitude, photo.Longitude, photo.Caption));
    }

    [HttpPost("{id}/products")]
    public async Task<ActionResult<ProductEntryDto>> AddProduct(Guid id, [FromBody] AddProductRequest req)
    {
        var uid = GetUserId();
        var visit = await _db.Visits.FindAsync(id);
        if (visit == null) return NotFound();
        if (visit.UserId != uid) return Forbid();

        var entry = new ProductEntry
        {
            VisitId = id,
            Brand = req.Brand,
            Category = req.Category,
            Model = req.Model,
            DisplayType = req.DisplayType,
            Quantity = req.Quantity,
            Price = req.Price,
            Notes = req.Notes
        };

        _db.ProductEntries.Add(entry);
        await _db.SaveChangesAsync();

        return Created($"/api/visits/{id}/products/{entry.Id}",
            new ProductEntryDto(entry.Id, entry.Brand, entry.Category, entry.Model, entry.DisplayType, entry.Quantity, entry.Price, entry.Notes));
    }

    [HttpPut("{visitId}/products/{productId}")]
    public async Task<IActionResult> UpdateProduct(Guid visitId, Guid productId, [FromBody] AddProductRequest req)
    {
        var uid = GetUserId();
        var visit = await _db.Visits.FindAsync(visitId);
        if (visit == null) return NotFound();
        if (visit.UserId != uid) return Forbid();

        var entry = await _db.ProductEntries.FirstOrDefaultAsync(p => p.Id == productId && p.VisitId == visitId);
        if (entry == null) return NotFound();

        entry.Brand = req.Brand;
        entry.Category = req.Category;
        entry.Model = req.Model;
        entry.DisplayType = req.DisplayType;
        entry.Quantity = req.Quantity;
        entry.Price = req.Price;
        entry.Notes = req.Notes;
        await _db.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{visitId}/products/{productId}")]
    public async Task<IActionResult> DeleteProduct(Guid visitId, Guid productId)
    {
        var uid = GetUserId();
        var visit = await _db.Visits.FindAsync(visitId);
        if (visit == null) return NotFound();
        if (visit.UserId != uid) return Forbid();

        var entry = await _db.ProductEntries.FirstOrDefaultAsync(p => p.Id == productId && p.VisitId == visitId);
        if (entry == null) return NotFound();

        _db.ProductEntries.Remove(entry);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{visitId}/photos/{photoId}")]
    public async Task<IActionResult> DeletePhoto(Guid visitId, Guid photoId)
    {
        var uid = GetUserId();
        var visit = await _db.Visits.FindAsync(visitId);
        if (visit == null) return NotFound();
        if (visit.UserId != uid) return Forbid();
        if (visit.Status != VisitStatus.InProgress) return BadRequest(new { message = "Visit not in progress" });

        var photo = await _db.VisitPhotos.FirstOrDefaultAsync(p => p.Id == photoId && p.VisitId == visitId);
        if (photo == null) return NotFound();

        // Delete file from disk
        var filePath = Path.Combine(_env.ContentRootPath, photo.PhotoUrl.TrimStart('/'));
        if (System.IO.File.Exists(filePath))
            System.IO.File.Delete(filePath);

        _db.VisitPhotos.Remove(photo);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    [HttpPost("{id}/cancel")]
    public async Task<IActionResult> CancelVisit(Guid id)
    {
        var uid = GetUserId();
        var visit = await _db.Visits.Include(v => v.Photos).Include(v => v.Products).FirstOrDefaultAsync(v => v.Id == id);
        if (visit == null) return NotFound();
        if (visit.UserId != uid) return Forbid();
        if (visit.Status != VisitStatus.InProgress) return BadRequest(new { message = "Visit not in progress" });

        // Delete all photos from disk
        foreach (var photo in visit.Photos)
        {
            var filePath = Path.Combine(_env.ContentRootPath, photo.PhotoUrl.TrimStart('/'));
            if (System.IO.File.Exists(filePath))
                System.IO.File.Delete(filePath);
        }

        // Remove all related records and the visit itself
        _db.VisitPhotos.RemoveRange(visit.Photos);
        _db.ProductEntries.RemoveRange(visit.Products);
        _db.Visits.Remove(visit);
        await _db.SaveChangesAsync();

        return NoContent();
    }



    [HttpGet("active")]
    public async Task<ActionResult<VisitDto?>> GetActiveVisit()
    {
        var uid = GetUserId();
        var v = await _db.Visits.Include(v => v.User).Include(v => v.Store).Include(v => v.Photos).Include(v => v.Products)
            .FirstOrDefaultAsync(v => v.UserId == uid && v.Status == VisitStatus.InProgress);

        return v == null ? Ok(null as VisitDto) : Ok(MapVisit(v));
    }

    [HttpGet("unreviewed-count")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<ActionResult<object>> GetUnreviewedCount()
    {
        var count = await _db.Visits.CountAsync(v => v.Status == VisitStatus.Completed && v.ReviewStatus == null);
        return Ok(new { count });
    }

    [HttpPost("{id}/approve")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> Approve(Guid id, [FromBody] ApproveVisitRequest req)
    {
        var visit = await _db.Visits.Include(v => v.Store).Include(v => v.User).FirstOrDefaultAsync(v => v.Id == id);
        if (visit == null) return NotFound();

        var adminId = GetUserId();
        visit.ReviewStatus = ReviewStatus.Approved;
        visit.ReviewedByAdminId = adminId;
        visit.ReviewedAt = DateTime.UtcNow;
        visit.ReviewComment = req.Comment;

        if (!string.IsNullOrEmpty(req.Comment))
        {
            _db.VisitComments.Add(new VisitComment
            {
                VisitId = id,
                AuthorId = adminId,
                Text = req.Comment,
                AuthorRole = CommentAuthorRole.Admin
            });
        }

        await _db.SaveChangesAsync();

        await _audit.LogAsync(adminId, nameof(AuditAction.VisitApproved), "Visit", id.ToString(), null, new { reviewStatus = "Approved" }, GetIp(),
            visit.Store.Name, $"Visit to '{visit.Store.Name}' by {visit.User.FullName} approved");

        await _notifications.CreateAndSendAsync(new Notification
        {
            RecipientId = visit.UserId,
            Type = NotificationType.VisitApproved,
            Title = "Visit Approved ✅",
            Body = $"Your visit to {visit.Store.Name} was approved!{(req.Comment != null ? $" \"{req.Comment}\"" : "")}",
            RelatedEntityId = id.ToString(),
            RelatedEntityType = "Visit",
            ActionUrl = $"/visit/{id}",
            MetadataJson = JsonSerializer.Serialize(new { storeName = visit.Store.Name, comment = req.Comment })
        });

        return NoContent();
    }

    [HttpPost("{id}/reject")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> Reject(Guid id, [FromBody] RejectVisitRequest req)
    {
        var visit = await _db.Visits.Include(v => v.Store).Include(v => v.User).FirstOrDefaultAsync(v => v.Id == id);
        if (visit == null) return NotFound();

        var adminId = GetUserId();
        visit.ReviewStatus = ReviewStatus.Rejected;
        visit.ReviewedByAdminId = adminId;
        visit.ReviewedAt = DateTime.UtcNow;
        visit.ReviewComment = req.Comment;
        visit.RequiresRevisit = req.RequiresRevisit;

        if (!string.IsNullOrEmpty(req.Comment))
        {
            _db.VisitComments.Add(new VisitComment
            {
                VisitId = id,
                AuthorId = adminId,
                Text = req.Comment,
                AuthorRole = CommentAuthorRole.Admin
            });
        }

        await _db.SaveChangesAsync();

        // Auto-create revisit schedule if required
        if (req.RequiresRevisit)
        {
            var revisitDue = DateTime.SpecifyKind(DateTime.UtcNow.Date.AddDays(1), DateTimeKind.Utc);
            var schedule = new VisitSchedule
            {
                EmployeeId = visit.UserId,
                StoreId = visit.StoreId,
                DueDate = revisitDue,
                Status = ScheduleStatus.Pending,
                AdminNotes = $"Revisit required — rejected visit on {DateTime.UtcNow:MMM d, yyyy}",
                CreatedByAdminId = adminId
            };
            _db.VisitSchedules.Add(schedule);
            await _db.SaveChangesAsync();
        }

        await _audit.LogAsync(adminId, nameof(AuditAction.VisitRejected), "Visit", id.ToString(), null, new { reviewStatus = "Rejected", req.RequiresRevisit }, GetIp(),
            visit.Store.Name, $"Visit to '{visit.Store.Name}' by {visit.User.FullName} rejected");

        await _notifications.CreateAndSendAsync(new Notification
        {
            RecipientId = visit.UserId,
            Type = NotificationType.VisitRejected,
            Title = "Visit Rejected ❌",
            Body = $"Your visit to {visit.Store.Name} needs attention.{(req.Comment != null ? $" \"{req.Comment}\"" : "")}{(req.RequiresRevisit ? " A revisit has been scheduled for tomorrow." : "")}",
            RelatedEntityId = id.ToString(),
            RelatedEntityType = "Visit",
            ActionUrl = $"/visit/{id}",
            MetadataJson = JsonSerializer.Serialize(new { storeName = visit.Store.Name, comment = req.Comment, requiresRevisit = req.RequiresRevisit })
        });

        return NoContent();
    }

    [HttpGet("{id}/comments")]
    public async Task<ActionResult<List<VisitCommentDto>>> GetComments(Guid id)
    {
        var uid = GetUserId();
        var role = User.FindFirstValue(ClaimTypes.Role);
        var visit = await _db.Visits.FindAsync(id);
        if (visit == null) return NotFound();
        if (visit.UserId != uid && role == "Employee") return Forbid();

        var comments = await _db.VisitComments
            .Include(c => c.Author)
            .Where(c => c.VisitId == id)
            .OrderBy(c => c.CreatedAt)
            .Select(c => new VisitCommentDto(c.Id, c.VisitId, c.AuthorId, c.Author.FullName, c.Author.AvatarUrl,
                c.Text, c.AuthorRole.ToString(), c.CreatedAt, c.IsRead))
            .ToListAsync();

        return Ok(comments);
    }

    [HttpPost("{id}/comments")]
    public async Task<ActionResult<VisitCommentDto>> AddComment(Guid id, [FromBody] CreateCommentRequest req)
    {
        var uid = GetUserId();
        var role = User.FindFirstValue(ClaimTypes.Role);
        var visit = await _db.Visits.Include(v => v.Store).Include(v => v.User).FirstOrDefaultAsync(v => v.Id == id);
        if (visit == null) return NotFound();
        if (visit.UserId != uid && role == "Employee") return Forbid();

        var authorRole = role == "Employee" ? CommentAuthorRole.Employee : CommentAuthorRole.Admin;
        var user = await _db.Users.FindAsync(uid);

        var comment = new VisitComment
        {
            VisitId = id,
            AuthorId = uid,
            Text = req.Text,
            AuthorRole = authorRole
        };

        _db.VisitComments.Add(comment);
        await _db.SaveChangesAsync();

        // Notify the other party
        if (authorRole == CommentAuthorRole.Employee)
        {
            // Find admins who reviewed or created schedules for this employee
            var adminIds = await _db.VisitSchedules
                .Where(s => s.EmployeeId == uid)
                .Select(s => s.CreatedByAdminId)
                .Distinct()
                .ToListAsync();

            if (visit.ReviewedByAdminId.HasValue && !adminIds.Contains(visit.ReviewedByAdminId.Value))
                adminIds.Add(visit.ReviewedByAdminId.Value);

            foreach (var adminId in adminIds)
            {
                await _notifications.CreateAndSendAsync(new Notification
                {
                    RecipientId = adminId,
                    Type = NotificationType.EmployeeCommentAdded,
                    Title = "Employee Replied",
                    Body = $"{user!.FullName} replied on visit to {visit.Store.Name}",
                    RelatedEntityId = id.ToString(),
                    RelatedEntityType = "Visit",
                    ActionUrl = $"/visit/{id}",
                    MetadataJson = JsonSerializer.Serialize(new { employeeName = user!.FullName, storeName = visit.Store.Name })
                });
            }
        }
        else
        {
            await _notifications.CreateAndSendAsync(new Notification
            {
                RecipientId = visit.UserId,
                Type = NotificationType.AdminCommentAdded,
                Title = "New Comment from Admin",
                Body = $"{user!.FullName} commented on your visit to {visit.Store.Name}",
                RelatedEntityId = id.ToString(),
                RelatedEntityType = "Visit",
                ActionUrl = $"/visit/{id}",
                MetadataJson = JsonSerializer.Serialize(new { employeeName = user!.FullName, storeName = visit.Store.Name })
            });
        }

        return Created($"/api/visits/{id}/comments/{comment.Id}",
            new VisitCommentDto(comment.Id, comment.VisitId, comment.AuthorId, user!.FullName, user.AvatarUrl,
                comment.Text, comment.AuthorRole.ToString(), comment.CreatedAt, comment.IsRead));
    }

    [HttpPut("{visitId}/comments/{commentId}/read")]
    public async Task<IActionResult> MarkCommentRead(Guid visitId, Guid commentId)
    {
        var uid = GetUserId();
        var comment = await _db.VisitComments.FirstOrDefaultAsync(c => c.Id == commentId && c.VisitId == visitId);
        if (comment == null) return NotFound();

        comment.IsRead = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string GetIp() => HttpContext.Connection.RemoteIpAddress?.ToString() ?? "";

    private static VisitDto MapVisit(Visit v) => new(
        v.Id, v.UserId, v.User?.FullName ?? "", v.User?.AvatarUrl,
        v.StoreId, v.Store?.Name ?? "", v.Store?.Address ?? "",
        v.CheckInTime, v.CheckOutTime, v.CheckInLatitude, v.CheckInLongitude,
        v.CheckOutLatitude, v.CheckOutLongitude,
        v.DistanceFromStore, v.GpsVerified, v.Status.ToString(), v.Notes,
        v.ReviewStatus?.ToString(), v.ReviewedByAdminId, v.ReviewedByAdmin?.FullName,
        v.ReviewedAt, v.ReviewComment, v.RequiresRevisit,
        v.Photos.Select(p => new VisitPhotoDto(p.Id, p.PhotoUrl, p.ThumbnailUrl, p.Type.ToString(), p.CapturedAt, p.Latitude, p.Longitude, p.Caption)).ToList(),
        v.Products.Select(p => new ProductEntryDto(p.Id, p.Brand, p.Category, p.Model, p.DisplayType, p.Quantity, p.Price, p.Notes)).ToList()
    );
}
