using Microsoft.EntityFrameworkCore;
using LGSupervisor.Api.Models;

namespace LGSupervisor.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Store> Stores => Set<Store>();
    public DbSet<UserStore> UserStores => Set<UserStore>();
    public DbSet<Visit> Visits => Set<Visit>();
    public DbSet<VisitPhoto> VisitPhotos => Set<VisitPhoto>();
    public DbSet<ProductEntry> ProductEntries => Set<ProductEntry>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<VisitSchedule> VisitSchedules => Set<VisitSchedule>();
    public DbSet<VisitComment> VisitComments => Set<VisitComment>();
    public DbSet<Notification> Notifications => Set<Notification>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User
        modelBuilder.Entity<User>(e =>
        {
            e.HasKey(u => u.Id);
            e.HasIndex(u => u.Email).IsUnique();
            e.Property(u => u.Role).HasConversion<string>();
            e.Property(u => u.AccountStatus).HasDefaultValue(UserAccountStatus.Active);
        });

        // Store
        modelBuilder.Entity<Store>(e =>
        {
            e.HasKey(s => s.Id);
            e.HasIndex(s => s.Name);
        });

        // UserStore (many-to-many)
        modelBuilder.Entity<UserStore>(e =>
        {
            e.HasKey(us => new { us.UserId, us.StoreId });
            e.HasOne(us => us.User).WithMany(u => u.AssignedStores).HasForeignKey(us => us.UserId);
            e.HasOne(us => us.Store).WithMany(s => s.AssignedUsers).HasForeignKey(us => us.StoreId);
        });

        // Visit
        modelBuilder.Entity<Visit>(e =>
        {
            e.HasKey(v => v.Id);
            e.HasOne(v => v.User).WithMany(u => u.Visits).HasForeignKey(v => v.UserId);
            e.HasOne(v => v.Store).WithMany(s => s.Visits).HasForeignKey(v => v.StoreId);
            e.Property(v => v.Status).HasConversion<string>();
            e.HasIndex(v => v.CheckInTime);
            e.HasIndex(v => new { v.UserId, v.CheckInTime });
        });

        // VisitPhoto
        modelBuilder.Entity<VisitPhoto>(e =>
        {
            e.HasKey(p => p.Id);
            e.HasOne(p => p.Visit).WithMany(v => v.Photos).HasForeignKey(p => p.VisitId);
            e.Property(p => p.Type).HasConversion<string>();
        });

        // ProductEntry
        modelBuilder.Entity<ProductEntry>(e =>
        {
            e.HasKey(p => p.Id);
            e.HasOne(p => p.Visit).WithMany(v => v.Products).HasForeignKey(p => p.VisitId);
            e.Property(p => p.Price).HasPrecision(18, 2);
            e.HasIndex(p => p.Brand);
        });

        // AuditLog
        modelBuilder.Entity<AuditLog>(e =>
        {
            e.HasKey(a => a.Id);
            e.HasOne(a => a.User).WithMany().HasForeignKey(a => a.UserId).OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(a => a.Timestamp);
            e.HasIndex(a => a.UserId);
        });

        // VisitSchedule
        modelBuilder.Entity<VisitSchedule>(e =>
        {
            e.HasKey(s => s.Id);
            e.HasOne(s => s.Employee).WithMany().HasForeignKey(s => s.EmployeeId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(s => s.Store).WithMany().HasForeignKey(s => s.StoreId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(s => s.ActualVisit).WithMany().HasForeignKey(s => s.ActualVisitId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(s => s.CreatedByAdmin).WithMany().HasForeignKey(s => s.CreatedByAdminId).OnDelete(DeleteBehavior.Cascade);
            e.Property(s => s.Status).HasConversion<string>();
            e.HasIndex(s => new { s.EmployeeId, s.DueDate });
            e.HasIndex(s => s.DueDate);
        });

        // VisitComment
        modelBuilder.Entity<VisitComment>(e =>
        {
            e.HasKey(c => c.Id);
            e.HasOne(c => c.Visit).WithMany(v => v.Comments).HasForeignKey(c => c.VisitId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(c => c.Author).WithMany().HasForeignKey(c => c.AuthorId).OnDelete(DeleteBehavior.Cascade);
            e.Property(c => c.AuthorRole).HasConversion<string>();
            e.HasIndex(c => c.VisitId);
        });

        // Visit — ReviewedByAdmin FK
        modelBuilder.Entity<Visit>(e2 =>
        {
            e2.HasOne(v => v.ReviewedByAdmin).WithMany().HasForeignKey(v => v.ReviewedByAdminId).OnDelete(DeleteBehavior.SetNull);
            e2.Property(v => v.ReviewStatus).HasConversion<string>();
        });

        // Notification
        modelBuilder.Entity<Notification>(e =>
        {
            e.HasKey(n => n.Id);
            e.HasOne(n => n.Recipient).WithMany().HasForeignKey(n => n.RecipientId).OnDelete(DeleteBehavior.Cascade);
            e.Property(n => n.Type).HasConversion<string>();
            e.HasIndex(n => new { n.RecipientId, n.IsRead });
            e.HasIndex(n => n.CreatedAt);
        });

        SeedData(modelBuilder);
    }

    private static void SeedData(ModelBuilder modelBuilder)
    {
        var adminId = Guid.Parse("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
        var emp1Id = Guid.Parse("b2c3d4e5-f6a7-8901-bcde-f12345678901");
        var emp2Id = Guid.Parse("c3d4e5f6-a7b8-9012-cdef-123456789012");
        var superAdminId = Guid.Parse("d4e5f6a7-b8c9-0123-defa-234567890123");

        // SHA256 hash of "Password123!" - matching AuthController's VerifyPassword
        var passwordHash = Convert.ToBase64String(
            System.Security.Cryptography.SHA256.HashData(
                System.Text.Encoding.UTF8.GetBytes("Password123!")));

        modelBuilder.Entity<User>().HasData(
            new User { Id = superAdminId, FullName = "System Admin", Email = "superadmin@lg.com", PhoneNumber = "+998901234567", PasswordHash = passwordHash, Role = UserRole.SuperAdmin },
            new User { Id = adminId, FullName = "Admin Manager", Email = "admin@lg.com", PhoneNumber = "+998901234568", PasswordHash = passwordHash, Role = UserRole.Admin },
            new User { Id = emp1Id, FullName = "Amir Karimov", Email = "amir@lg.com", PhoneNumber = "+998901234569", PasswordHash = passwordHash, Role = UserRole.Employee, RegionId = "tashkent", RegionName = "Tashkent" },
            new User { Id = emp2Id, FullName = "Sara Mukhtarova", Email = "sara@lg.com", PhoneNumber = "+998901234570", PasswordHash = passwordHash, Role = UserRole.Employee, RegionId = "tashkent", RegionName = "Tashkent" }
        );

        var s1 = Guid.Parse("11111111-1111-1111-1111-111111111111");
        var s2 = Guid.Parse("22222222-2222-2222-2222-222222222222");
        var s3 = Guid.Parse("33333333-3333-3333-3333-333333333333");
        var s4 = Guid.Parse("44444444-4444-4444-4444-444444444444");

        modelBuilder.Entity<Store>().HasData(
            new Store { Id = s1, Name = "Texnomart NEXT", Address = "Shota Rustaveli St, 12", City = "Tashkent", Latitude = 41.2997, Longitude = 69.2403, RegionId = "tashkent", RegionName = "Tashkent" },
            new Store { Id = s2, Name = "Texnomart Main", Address = "Amir Temur Ave, 108", City = "Tashkent", Latitude = 41.3010, Longitude = 69.2415, RegionId = "tashkent", RegionName = "Tashkent" },
            new Store { Id = s3, Name = "MediaPark", Address = "Buyuk Ipak Yuli, 34", City = "Tashkent", Latitude = 41.2985, Longitude = 69.2388, RegionId = "tashkent", RegionName = "Tashkent" },
            new Store { Id = s4, Name = "Eldorado Electronics", Address = "Mustakillik Ave, 56", City = "Tashkent", Latitude = 41.3050, Longitude = 69.2500, RegionId = "tashkent", RegionName = "Tashkent" }
        );

        modelBuilder.Entity<UserStore>().HasData(
            new UserStore { UserId = emp1Id, StoreId = s1, AssignedAt = DateTime.UtcNow },
            new UserStore { UserId = emp1Id, StoreId = s2, AssignedAt = DateTime.UtcNow },
            new UserStore { UserId = emp1Id, StoreId = s3, AssignedAt = DateTime.UtcNow },
            new UserStore { UserId = emp2Id, StoreId = s2, AssignedAt = DateTime.UtcNow },
            new UserStore { UserId = emp2Id, StoreId = s3, AssignedAt = DateTime.UtcNow },
            new UserStore { UserId = emp2Id, StoreId = s4, AssignedAt = DateTime.UtcNow }
        );
    }
}
