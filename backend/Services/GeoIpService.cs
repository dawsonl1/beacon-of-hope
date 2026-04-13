using System.Net;
using MaxMind.GeoIP2;
using MaxMind.GeoIP2.Exceptions;

namespace backend.Services;

public record GeoIpResult(
    string? Country,
    string? City,
    string? Region,
    double? Latitude,
    double? Longitude,
    long? Asn,
    string? AsnOrg);

public interface IGeoIpService
{
    GeoIpResult Lookup(string? ipAddress);
}

public sealed class GeoIpService : IGeoIpService, IDisposable
{
    private readonly DatabaseReader? _city;
    private readonly DatabaseReader? _asn;
    private readonly ILogger<GeoIpService> _logger;

    public GeoIpService(IConfiguration config, ILogger<GeoIpService> logger)
    {
        _logger = logger;
        var cityPath = config["GeoIp:CityDbPath"] ?? "/opt/geoip/GeoLite2-City.mmdb";
        var asnPath = config["GeoIp:AsnDbPath"] ?? "/opt/geoip/GeoLite2-ASN.mmdb";

        if (File.Exists(cityPath))
            _city = new DatabaseReader(cityPath);
        else
            _logger.LogWarning("GeoLite2-City.mmdb not found at {Path} — city lookups disabled", cityPath);

        if (File.Exists(asnPath))
            _asn = new DatabaseReader(asnPath);
        else
            _logger.LogWarning("GeoLite2-ASN.mmdb not found at {Path} — ASN lookups disabled", asnPath);
    }

    public GeoIpResult Lookup(string? ipAddress)
    {
        if (string.IsNullOrWhiteSpace(ipAddress) || !IPAddress.TryParse(ipAddress, out var ip))
            return new GeoIpResult(null, null, null, null, null, null, null);

        string? country = null, city = null, region = null;
        double? lat = null, lng = null;
        long? asn = null;
        string? asnOrg = null;

        if (_city is not null)
        {
            try
            {
                var c = _city.City(ip);
                country = c.Country?.IsoCode;
                city = c.City?.Name;
                region = c.MostSpecificSubdivision?.Name;
                lat = c.Location?.Latitude;
                lng = c.Location?.Longitude;
            }
            catch (AddressNotFoundException) { }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "City lookup failed for {Ip}", ipAddress);
            }
        }

        if (_asn is not null)
        {
            try
            {
                var a = _asn.Asn(ip);
                asn = a.AutonomousSystemNumber;
                asnOrg = a.AutonomousSystemOrganization;
            }
            catch (AddressNotFoundException) { }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "ASN lookup failed for {Ip}", ipAddress);
            }
        }

        return new GeoIpResult(country, city, region, lat, lng, asn, asnOrg);
    }

    public void Dispose()
    {
        _city?.Dispose();
        _asn?.Dispose();
    }
}
