using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using LGSupervisor.Api.Data;
using LGSupervisor.Api.Hubs;
using LGSupervisor.Api.Models;

namespace LGSupervisor.Api.Services;

public interface INotificationService
{
    Task CreateAndSendAsync(Notification notification);
}

public class NotificationService : INotificationService
{
    private readonly AppDbContext _db;
    private readonly IHubContext<NotificationHub> _hub;

    public NotificationService(AppDbContext db, IHubContext<NotificationHub> hub)
    {
        _db = db;
        _hub = hub;
    }

    public async Task CreateAndSendAsync(Notification notification)
    {
        _db.Notifications.Add(notification);
        await _db.SaveChangesAsync();

        await _hub.Clients
            .User(notification.RecipientId.ToString())
            .SendAsync("NewNotification", new
            {
                id = notification.Id,
                type = notification.Type.ToString(),
                title = notification.Title,
                body = notification.Body,
                createdAt = notification.CreatedAt,
                actionUrl = notification.ActionUrl,
                isRead = false,
                metadataJson = notification.MetadataJson
            });
    }
}
