namespace LGSupervisor.Api.Models;

public enum UserRole { Employee, Admin, SuperAdmin }
public enum UserAccountStatus { Active = 0, Pending = 1, Rejected = 2, Suspended = 3 }
public enum VisitStatus { InProgress, Completed }
public enum PhotoType { CheckIn, Shelf, Product, General }
public enum ScheduleStatus { Pending, Completed, Missed, Cancelled }
public enum ReviewStatus { NotReviewed, Approved, Rejected }
public enum CommentAuthorRole { Admin, Employee }
public enum NotificationType
{
    VisitApproved,
    VisitRejected,
    ScheduleCreated,
    ScheduleCancelled,
    AdminCommentAdded,
    VisitSubmitted,
    ScheduleMissed,
    EmployeeCheckedIn,
    EmployeeCommentAdded,
    NewRegistrationRequest,
    RegistrationApproved,
    RegistrationRejected
}
public enum AuditAction
{
    UserLoggedIn, UserLoggedOut, UserLoginFailed,
    UserCreated, UserUpdated, UserDeactivated, UserRoleChanged, PasswordReset,
    StoreCreated, StoreUpdated, StoreDeactivated,
    EmployeeAssignedToStore, EmployeeRemovedFromStore,
    ScheduleCreated, ScheduleCancelled, ScheduleMarkedMissed,
    VisitStarted, VisitCompleted, VisitApproved, VisitRejected,
    SystemJobRan,
    UserRegistrationRequested, UserApproved, UserRejected
}

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.Employee;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastLoginAt { get; set; }
    public string? AvatarUrl { get; set; }
    public string? RegionId { get; set; }
    public string? RegionName { get; set; }
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiryTime { get; set; }
    public UserAccountStatus AccountStatus { get; set; } = UserAccountStatus.Active;
    public DateTime? RegistrationRequestedAt { get; set; }
    public Guid? ReviewedByAdminId { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? RejectionReason { get; set; }
    public string? PinnedDashboardWidgets { get; set; }
    public ICollection<Visit> Visits { get; set; } = new List<Visit>();
    public ICollection<UserStore> AssignedStores { get; set; } = new List<UserStore>();
}

public class Store
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string RegionId { get; set; } = "tashkent";
    public string RegionName { get; set; } = "Tashkent";
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public int GeofenceRadius { get; set; } = 50;
    public string? ImageUrl { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<Visit> Visits { get; set; } = new List<Visit>();
    public ICollection<UserStore> AssignedUsers { get; set; } = new List<UserStore>();
}

public class UserStore
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public Guid StoreId { get; set; }
    public Store Store { get; set; } = null!;
    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
}

public class Visit
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public Guid StoreId { get; set; }
    public Store Store { get; set; } = null!;
    public DateTime CheckInTime { get; set; } = DateTime.UtcNow;
    public DateTime? CheckOutTime { get; set; }
    public double CheckInLatitude { get; set; }
    public double CheckInLongitude { get; set; }
    public double? CheckOutLatitude { get; set; }
    public double? CheckOutLongitude { get; set; }
    public double DistanceFromStore { get; set; }
    public bool GpsVerified { get; set; }
    public VisitStatus Status { get; set; } = VisitStatus.InProgress;
    public string? Notes { get; set; }
    public ReviewStatus? ReviewStatus { get; set; }
    public Guid? ReviewedByAdminId { get; set; }
    public User? ReviewedByAdmin { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewComment { get; set; }
    public bool? RequiresRevisit { get; set; }
    public ICollection<VisitPhoto> Photos { get; set; } = new List<VisitPhoto>();
    public ICollection<ProductEntry> Products { get; set; } = new List<ProductEntry>();
    public ICollection<VisitComment> Comments { get; set; } = new List<VisitComment>();
}

public class VisitPhoto
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid VisitId { get; set; }
    public Visit Visit { get; set; } = null!;
    public string PhotoUrl { get; set; } = string.Empty;
    public string? ThumbnailUrl { get; set; }
    public PhotoType Type { get; set; } = PhotoType.General;
    public DateTime CapturedAt { get; set; } = DateTime.UtcNow;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string? Caption { get; set; }
}

public class ProductEntry
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid VisitId { get; set; }
    public Visit Visit { get; set; } = null!;
    public string Brand { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string DisplayType { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal Price { get; set; }
    public string? Notes { get; set; }
}

public class AuditLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? UserId { get; set; }
    public User? User { get; set; }
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string? EntityId { get; set; }
    public string? EntityName { get; set; }
    public string? Description { get; set; }
    public string? OldValues { get; set; }
    public string? NewValues { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string IpAddress { get; set; } = string.Empty;
    public string? RegionId { get; set; }
}

public class VisitSchedule
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid EmployeeId { get; set; }
    public User Employee { get; set; } = null!;
    public Guid StoreId { get; set; }
    public Store Store { get; set; } = null!;
    public DateTime DueDate { get; set; }
    public TimeSpan? DueTime { get; set; }
    public ScheduleStatus Status { get; set; } = ScheduleStatus.Pending;
    public Guid? ActualVisitId { get; set; }
    public Visit? ActualVisit { get; set; }
    public string? AdminNotes { get; set; }
    public Guid CreatedByAdminId { get; set; }
    public User CreatedByAdmin { get; set; } = null!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class VisitComment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid VisitId { get; set; }
    public Visit Visit { get; set; } = null!;
    public Guid AuthorId { get; set; }
    public User Author { get; set; } = null!;
    public string Text { get; set; } = string.Empty;
    public CommentAuthorRole AuthorRole { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsRead { get; set; }
}

public class Notification
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RecipientId { get; set; }
    public User Recipient { get; set; } = null!;
    public NotificationType Type { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReadAt { get; set; }
    public string? RelatedEntityId { get; set; }
    public string? RelatedEntityType { get; set; }
    public string? ActionUrl { get; set; }
    public string? MetadataJson { get; set; }
}
