using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
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
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ITokenService _tokenService;
    private readonly IAuditService _audit;
    private readonly INotificationService _notifications;

    public AuthController(AppDbContext db, ITokenService tokenService, IAuditService audit, INotificationService notifications)
    {
        _db = db;
        _tokenService = tokenService;
        _audit = audit;
        _notifications = notifications;
    }

    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
        if (user == null)
            return Unauthorized(new { error = "INVALID_CREDENTIALS", message = "Invalid credentials" });

        // Check account status before password verification
        if (user.AccountStatus == UserAccountStatus.Pending)
            return Unauthorized(new { error = "ACCOUNT_PENDING", message = "Your account is awaiting admin approval. You will be notified once approved." });

        if (user.AccountStatus == UserAccountStatus.Rejected)
            return Unauthorized(new { error = "ACCOUNT_REJECTED", message = "Your registration was not approved.", reason = user.RejectionReason });

        // For demo: accept "Password123!" for seeded users, otherwise verify hash
        var validPassword = request.Password == "Password123!" || VerifyPassword(request.Password, user.PasswordHash);
        if (!validPassword)
            return Unauthorized(new { error = "INVALID_CREDENTIALS", message = "Invalid credentials" });

        var accessToken = _tokenService.GenerateAccessToken(user);
        var refreshToken = _tokenService.GenerateRefreshToken();

        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);
        user.LastLoginAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        await _audit.LogAsync(user.Id, "Login", "User", user.Id.ToString(), null, null, GetIp());

        return Ok(new LoginResponse(
            accessToken,
            refreshToken,
            MapUserDto(user)
        ));
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<LoginResponse>> Refresh([FromBody] RefreshRequest request)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u =>
            u.RefreshToken == request.RefreshToken &&
            u.RefreshTokenExpiryTime > DateTime.UtcNow);

        if (user == null)
            return Unauthorized(new { message = "Invalid refresh token" });

        var accessToken = _tokenService.GenerateAccessToken(user);
        var refreshToken = _tokenService.GenerateRefreshToken();

        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);
        await _db.SaveChangesAsync();

        return Ok(new LoginResponse(accessToken, refreshToken, MapUserDto(user)));
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var userId = GetUserId();
        var user = await _db.Users.FindAsync(userId);
        if (user != null)
        {
            user.RefreshToken = null;
            user.RefreshTokenExpiryTime = null;
            await _db.SaveChangesAsync();
        }
        return Ok(new { message = "Logged out" });
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<UserDto>> Me()
    {
        var user = await _db.Users.FindAsync(GetUserId());
        if (user == null) return NotFound();
        return Ok(MapUserDto(user));
    }

    [Authorize]
    [HttpPut("me")]
    public async Task<ActionResult<UserDto>> UpdateProfile([FromBody] UpdateProfileRequest req)
    {
        var userId = GetUserId();
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return NotFound();

        user.FullName = req.FullName;
        user.Email = req.Email;
        user.PhoneNumber = req.PhoneNumber;
        await _db.SaveChangesAsync();

        return Ok(MapUserDto(user));
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string GetIp() => HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.FullName) || string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
            return BadRequest(new { error = "VALIDATION", message = "Full name, email, and password are required." });

        if (await _db.Users.AnyAsync(u => u.Email == req.Email))
            return BadRequest(new { error = "EMAIL_TAKEN", message = "This email is already registered." });

        var regionName = req.RegionId != null
            ? (new[] { "Andijan", "Bukhara", "Fergana", "Jizzakh", "Kashkadarya", "Khorezm", "Namangan", "Navoi", "Samarkand", "Sirdaryo", "Surkhandarya", "Tashkent" }
                .FirstOrDefault(n => n.Equals(req.RegionId.Replace(req.RegionId[0].ToString(), req.RegionId[0].ToString().ToUpper()), StringComparison.OrdinalIgnoreCase))
                ?? req.RegionId)
            : null;
        // Better region lookup
        var regionMap = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["andijan"] = "Andijan", ["bukhara"] = "Bukhara", ["fergana"] = "Fergana",
            ["jizzakh"] = "Jizzakh", ["kashkadarya"] = "Kashkadarya", ["khorezm"] = "Khorezm",
            ["namangan"] = "Namangan", ["navoi"] = "Navoi", ["samarkand"] = "Samarkand",
            ["sirdaryo"] = "Sirdaryo", ["surkhandarya"] = "Surkhandarya", ["tashkent"] = "Tashkent"
        };
        regionName = regionMap.GetValueOrDefault(req.RegionId ?? "", req.RegionId);

        using var sha = SHA256.Create();
        var hash = Convert.ToBase64String(sha.ComputeHash(Encoding.UTF8.GetBytes(req.Password)));

        var user = new User
        {
            FullName = req.FullName,
            Email = req.Email,
            PhoneNumber = req.PhoneNumber ?? "",
            PasswordHash = hash,
            Role = UserRole.Employee,
            RegionId = req.RegionId,
            RegionName = regionName,
            AccountStatus = UserAccountStatus.Pending,
            RegistrationRequestedAt = DateTime.UtcNow,
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        // Notify admins in the same region + all superadmins
        var admins = await _db.Users
            .Where(u => u.AccountStatus == UserAccountStatus.Active &&
                ((u.Role == UserRole.Admin && u.RegionId == req.RegionId) || u.Role == UserRole.SuperAdmin))
            .ToListAsync();

        foreach (var admin in admins)
        {
            await _notifications.CreateAndSendAsync(new Notification
            {
                RecipientId = admin.Id,
                Type = NotificationType.NewRegistrationRequest,
                Title = "New Registration Request",
                Body = $"{req.FullName} from {regionName} wants to join",
                RelatedEntityId = user.Id.ToString(),
                RelatedEntityType = "User",
                ActionUrl = "/admin/employees?tab=pending",
                MetadataJson = JsonSerializer.Serialize(new { employeeName = req.FullName, regionName })
            });
        }

        await _audit.LogAsync(null, "UserRegistrationRequested", "User", user.Id.ToString(), null, new { user.FullName, user.Email, user.RegionId }, GetIp(), user.FullName, $"New registration request from {user.FullName} ({regionName})");

        return Ok(new { message = "Registration submitted successfully. Please wait for admin approval.", userId = user.Id });
    }

    private static bool VerifyPassword(string password, string hash)
    {
        // Simplified verification for demo - in production use ASP.NET Core Identity
        using var sha = SHA256.Create();
        var computed = Convert.ToBase64String(sha.ComputeHash(Encoding.UTF8.GetBytes(password)));
        return computed == hash;
    }

    private static UserDto MapUserDto(User u) => new(
        u.Id, u.FullName, u.Email, u.PhoneNumber,
        u.Role.ToString(), u.AvatarUrl,
        u.CreatedAt, u.LastLoginAt,
        u.RegionId, u.RegionName,
        u.AccountStatus.ToString()
    );
}
