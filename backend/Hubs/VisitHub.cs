using Microsoft.AspNetCore.SignalR;
using LGSupervisor.Api.Models;

namespace LGSupervisor.Api.Hubs;

public interface IVisitHubClient
{
    Task VisitStarted(object visitData);
    Task VisitCompleted(object visitData);
    Task PhotoUploaded(object photoData);

}

public class VisitHub : Hub<IVisitHubClient>
{
    public override async Task OnConnectedAsync()
    {
        // Only admins/superadmins should connect to the real-time feed
        var role = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
        if (role == UserRole.Admin.ToString() || role == UserRole.SuperAdmin.ToString())
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, "Admins");
        }
        await base.OnConnectedAsync();
    }
}
