using Microsoft.AspNetCore.Http;

namespace LGSupervisor.Api.Models.DTOs;

// Auth DTOs
public record LoginRequest(string Email, string Password);
public record LoginResponse(string AccessToken, string RefreshToken, UserDto User);
public record RefreshRequest(string RefreshToken);

// User DTOs
public record UserDto(Guid Id, string FullName, string Email, string PhoneNumber, string Role, string? AvatarUrl, DateTime CreatedAt, DateTime? LastLoginAt, string? RegionId, string? RegionName, string AccountStatus = "Active");
public record CreateUserRequest(string FullName, string Email, string PhoneNumber, string Password, string Role, string? RegionId, string? RegionName);
public record UpdateUserRequest(string FullName, string Email, string PhoneNumber, string Role, string? RegionId, string? RegionName);
public record UpdateProfileRequest(string FullName, string Email, string PhoneNumber);
public record ChangeRoleRequest(string Role);
public record ResetPasswordRequest(string NewPassword);
public record RegisterRequest(string FullName, string Email, string PhoneNumber, string Password, string RegionId);
public record RejectUserRequest(string Reason);
public record PendingUserDto(Guid Id, string FullName, string Email, string PhoneNumber, string? RegionId, string? RegionName, DateTime? RegistrationRequestedAt);

// Employee Detail DTOs
public record AssignedStoreInfo(Guid Id, string Name, string Address, string RegionName);
public record EmployeeDetailStats(
    int TotalVisits, int CompletedVisits, int MissedVisits,
    int PendingSchedules, int ApprovedVisits, int RejectedVisits,
    DateTime? LastVisitDate);
public record EmployeeDetailDto(
    Guid Id, string FullName, string Email, string PhoneNumber, string Role,
    string? AvatarUrl, DateTime CreatedAt, DateTime? LastLoginAt,
    string? RegionId, string? RegionName, string AccountStatus,
    List<AssignedStoreInfo> AssignedStores, EmployeeDetailStats Stats);
public record EmployeeVisitDto(
    Guid Id, Guid StoreId, string StoreName, string StoreAddress, string? StoreRegionName,
    DateTime CheckInTime, DateTime? CheckOutTime, string Status,
    string? ReviewStatus, string? ReviewedByAdminName, DateTime? ReviewedAt,
    string? ReviewComment, bool? RequiresRevisit,
    int PhotosCount, int ProductsCount, double DistanceFromStore,
    Guid? ScheduleId, DateTime? ScheduleDueDate);
public record EmployeeScheduleDto(
    Guid Id, Guid StoreId, string StoreName, string StoreAddress, string? StoreRegionName,
    DateTime DueDate, TimeSpan? DueTime, string Status, string? AdminNotes,
    string CreatedByAdminName, DateTime CreatedAt,
    Guid? ActualVisitId, DateTime? ActualVisitCheckInTime);

// Store DTOs
public record StoreDto(Guid Id, string Name, string Address, string City, double Latitude, double Longitude, int GeofenceRadius, string? ImageUrl, int AssignedEmployees, int TotalVisits, string RegionId, string RegionName);
public record CreateStoreRequest(string Name, string Address, string City, double Latitude, double Longitude, int GeofenceRadius, string RegionId, string RegionName);
public record UpdateStoreRequest(string Name, string Address, string City, double Latitude, double Longitude, int GeofenceRadius, string RegionId, string RegionName);
public record NearbyStoreDto(Guid Id, string Name, string Address, string City, double Latitude, double Longitude, int GeofenceRadius, double Distance, bool IsWithinRange, string RegionId, string RegionName);

// Store Detail DTOs
public record StoreDetailStats(
    int TotalVisits, int CompletedVisits, int InProgressVisits,
    int ApprovedVisits, int RejectedVisits,
    int MissedSchedules, int PendingSchedules,
    int AssignedEmployees, DateTime? LastVisitDate);
public record AssignedEmployeeInfo(Guid Id, string FullName, string Email, string? AvatarUrl, DateTime AssignedAt);
public record StoreDetailDto(
    Guid Id, string Name, string Address, string City,
    double Latitude, double Longitude, int GeofenceRadius,
    string? ImageUrl, string RegionId, string RegionName, DateTime CreatedAt,
    List<AssignedEmployeeInfo> AssignedEmployees, StoreDetailStats Stats);
public record StoreVisitDto(
    Guid Id, Guid UserId, string UserName, string? UserAvatarUrl,
    DateTime CheckInTime, DateTime? CheckOutTime, string Status,
    string? ReviewStatus, string? ReviewedByAdminName, DateTime? ReviewedAt,
    string? ReviewComment, bool? RequiresRevisit,
    int PhotosCount, int ProductsCount, double DistanceFromStore,
    Guid? ScheduleId, DateTime? ScheduleDueDate);
public record StoreScheduleDto(
    Guid Id, Guid EmployeeId, string EmployeeName, string? EmployeeAvatarUrl,
    DateTime DueDate, TimeSpan? DueTime, string Status, string? AdminNotes,
    string CreatedByAdminName, DateTime CreatedAt,
    Guid? ActualVisitId, DateTime? ActualVisitCheckInTime);

// Visit DTOs
public record VisitDto(
    Guid Id, Guid UserId, string UserName, string? UserAvatarUrl,
    Guid StoreId, string StoreName, string StoreAddress,
    DateTime CheckInTime, DateTime? CheckOutTime,
    double CheckInLatitude, double CheckInLongitude,
    double? CheckOutLatitude, double? CheckOutLongitude,
    double DistanceFromStore, bool GpsVerified, string Status, string? Notes,
    string? ReviewStatus, Guid? ReviewedByAdminId, string? ReviewedByAdminName,
    DateTime? ReviewedAt, string? ReviewComment, bool? RequiresRevisit,
    List<VisitPhotoDto> Photos, List<ProductEntryDto> Products);
public record StartVisitRequest(Guid StoreId, double Latitude, double Longitude);
public record CheckOutRequest(double Latitude, double Longitude, string? Notes);


// Verification - see GeoService.VerificationInfo

// Photo DTOs
public record VisitPhotoDto(Guid Id, string PhotoUrl, string? ThumbnailUrl, string Type, DateTime CapturedAt, double Latitude, double Longitude, string? Caption);

public class UploadPhotoRequest
{
    public IFormFile? File { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string Type { get; set; } = "General";
    public string? Caption { get; set; }
}

// Product DTOs
public record ProductEntryDto(Guid Id, string Brand, string Category, string Model, string DisplayType, int Quantity, decimal Price, string? Notes);
public record AddProductRequest(string Brand, string Category, string Model, string DisplayType, int Quantity, decimal Price, string? Notes);

// Analytics DTOs
public record OverviewStats(
    int TotalVisits, int CompletedVisits, int GpsVerified,
    int ActiveEmployees, int TotalStores, int VisitedStores,
    int TotalProducts);
public record EmployeeStats(
    Guid Id, string FullName, string? AvatarUrl,
    int TotalVisits, int CompletedVisits,
    int StoresVisited, DateTime? LastVisit);
public record StoreAnalytics(
    Guid Id, string Name, string City, string RegionId,
    int TotalVisits, int GpsVerifiedVisits, int AssignedEmployees,
    int ProductEntries, DateTime? LastVisit);
public record BrandStats(string Brand, int TotalEntries, int TotalQuantity, int StoreCount, double AvgPrice);
public record DailyStats(DateTime Date, int TotalVisits, int Completed, int UniqueEmployees);

// Live Feed
public record LiveFeedItem(
    Guid VisitId, Guid UserId, string UserName, string? UserAvatarUrl,
    Guid StoreId, string StoreName, string EventType, DateTime Timestamp,
    bool GpsVerified, double Distance, string? PhotoUrl);

// Audit DTOs
public record AuditLogDto(Guid Id, Guid? UserId, string? UserName, string Action, string EntityType, string? EntityId, string? EntityName, string? Description, string? OldValues, string? NewValues, string? IpAddress, DateTime Timestamp, string? RegionId);

// Pagination
public record PagedResult<T>(List<T> Items, int TotalCount, int Page, int PageSize);

// Schedule DTOs
public record ScheduleDto(
    Guid Id, Guid EmployeeId, string EmployeeName, string? EmployeeAvatarUrl,
    Guid StoreId, string StoreName, string StoreRegionId,
    DateTime DueDate, TimeSpan? DueTime,
    string Status, Guid? ActualVisitId, string? AdminNotes,
    Guid CreatedByAdminId, string CreatedByAdminName,
    DateTime CreatedAt, DateTime UpdatedAt);
public record CreateScheduleRequest(Guid EmployeeId, Guid StoreId, DateTime DueDate, TimeSpan? DueTime, string? AdminNotes);
public record BulkCreateScheduleRequest(List<Guid> EmployeeIds, List<Guid> StoreIds, DateTime StartDate, DateTime EndDate, string? AdminNotes);
public record UpdateScheduleRequest(DateTime? DueDate, TimeSpan? DueTime, string? AdminNotes);
public record AssignStoreRequest(DateTime? DueDate, TimeSpan? DueTime);

// Visit Comment DTOs
public record VisitCommentDto(Guid Id, Guid VisitId, Guid AuthorId, string AuthorName, string? AuthorAvatarUrl, string Text, string AuthorRole, DateTime CreatedAt, bool IsRead);
public record CreateCommentRequest(string Text);
public record ApproveVisitRequest(string? Comment);
public record RejectVisitRequest(string? Comment, bool RequiresRevisit);

// Notification DTOs
public record NotificationDto(Guid Id, string Type, string Title, string Body, bool IsRead, DateTime CreatedAt, DateTime? ReadAt, string? RelatedEntityId, string? RelatedEntityType, string? ActionUrl, string? MetadataJson);
public record UnreadCountDto(int Count);
