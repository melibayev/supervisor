using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using LGSupervisor.Api.Data;
using LGSupervisor.Api.Models;

namespace LGSupervisor.Api.Services;

public class MarkMissedSchedulesJob : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<MarkMissedSchedulesJob> _logger;

    public MarkMissedSchedulesJob(IServiceProvider services, ILogger<MarkMissedSchedulesJob> logger)
    {
        _services = services;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            // Calculate delay until next 00:05 AM UTC
            var now = DateTime.UtcNow;
            var next = now.Date.AddDays(1).AddMinutes(5);
            if (now.TimeOfDay < TimeSpan.FromMinutes(5))
                next = now.Date.AddMinutes(5);

            var delay = next - now;
            if (delay > TimeSpan.Zero)
            {
                try { await Task.Delay(delay, stoppingToken); }
                catch (OperationCanceledException) { return; }
            }

            await MarkMissedAsync();
        }
    }

    public async Task MarkMissedAsync()
    {
        try
        {
            using var scope = _services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var notificationService = scope.ServiceProvider.GetRequiredService<INotificationService>();

            var yesterday = DateTime.UtcNow.Date.AddDays(-1);
            var missed = await db.VisitSchedules
                .Include(s => s.Employee)
                .Include(s => s.Store)
                .Where(s => s.DueDate.Date == yesterday && s.Status == ScheduleStatus.Pending)
                .ToListAsync();

            foreach (var schedule in missed)
            {
                schedule.Status = ScheduleStatus.Missed;
                schedule.UpdatedAt = DateTime.UtcNow;

                // Notify admin who created the schedule
                await notificationService.CreateAndSendAsync(new Notification
                {
                    RecipientId = schedule.CreatedByAdminId,
                    Type = NotificationType.ScheduleMissed,
                    Title = "Missed Visit 🚨",
                    Body = $"{schedule.Employee.FullName} missed scheduled visit to {schedule.Store.Name}",
                    RelatedEntityId = schedule.Id.ToString(),
                    RelatedEntityType = "VisitSchedule",
                    ActionUrl = "/admin/schedules?status=Missed",
                    MetadataJson = JsonSerializer.Serialize(new { employeeName = schedule.Employee.FullName, storeName = schedule.Store.Name })
                });

                // Notify the employee
                await notificationService.CreateAndSendAsync(new Notification
                {
                    RecipientId = schedule.EmployeeId,
                    Type = NotificationType.ScheduleMissed,
                    Title = "Missed Schedule ⚠️",
                    Body = $"You missed a scheduled visit to {schedule.Store.Name} on {schedule.DueDate:MMM d}",
                    RelatedEntityId = schedule.Id.ToString(),
                    RelatedEntityType = "VisitSchedule",
                    ActionUrl = "/dashboard",
                    MetadataJson = JsonSerializer.Serialize(new { storeName = schedule.Store.Name, date = schedule.DueDate.ToString("MMM d") })
                });
            }

            if (missed.Count > 0)
            {
                await db.SaveChangesAsync();
                _logger.LogInformation("Marked {Count} schedules as missed for {Date}", missed.Count, yesterday.ToShortDateString());
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error marking missed schedules");
        }
    }
}
