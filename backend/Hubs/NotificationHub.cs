using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace LGSupervisor.Api.Hubs;

[Authorize]
public class NotificationHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        await base.OnConnectedAsync();
    }

    public async Task JoinAnalyticsGroup()
    {
        var role = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
        if (role == "Admin" || role == "SuperAdmin")
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, "Analytics");
        }
    }
}
