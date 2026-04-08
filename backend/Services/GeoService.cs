namespace LGSupervisor.Api.Services;

public static class GeoService
{
    /// <summary>
    /// Calculates the Haversine distance between two GPS coordinates in meters.
    /// </summary>
    public static double HaversineDistance(double lat1, double lng1, double lat2, double lng2)
    {
        const double R = 6_371_000; // Earth radius in meters
        var dLat = ToRadians(lat2 - lat1);
        var dLng = ToRadians(lng2 - lng1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) *
                Math.Sin(dLng / 2) * Math.Sin(dLng / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return Math.Round(R * c, 1);
    }

    private static double ToRadians(double degrees) => degrees * Math.PI / 180.0;

    /// <summary>
    /// Verifies if a given position is within the geofence of a store.
    /// </summary>
    public static VerificationInfo Verify(double empLat, double empLng, double storeLat, double storeLng, int geofenceRadius)
    {
        var distance = HaversineDistance(empLat, empLng, storeLat, storeLng);
        string? warning = null;

        var status = distance switch
        {
            <= 50 => "Verified",
            <= 200 => "Warning",
            _ => "Rejected"
        };

        if (distance > geofenceRadius)
            warning = $"Employee is {distance:F0}m from store (max {geofenceRadius}m).";

        return new VerificationInfo
        {
            Distance = distance,
            IsVerified = distance <= geofenceRadius,
            Status = status,
            Warning = warning
        };
    }
}

public class VerificationInfo
{
    public double Distance { get; set; }
    public bool IsVerified { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Warning { get; set; }
}
