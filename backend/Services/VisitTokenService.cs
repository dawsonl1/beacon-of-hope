using System.Security.Cryptography;
using System.Text;

namespace backend.Services;

// Short-lived HMAC-signed token issued by /api/track/token and required by
// /api/track/visit. Prevents direct forgery of visit events from arbitrary
// clients: the beacon must first request a token (which is bound to the
// caller's IP + a random nonce + the issue timestamp) and echo it back within
// a few minutes.
public interface IVisitTokenService
{
    string Issue(string clientIp);
    bool Validate(string token, string clientIp, out string? failureReason);
}

public sealed class VisitTokenService : IVisitTokenService
{
    private const string TokenPurpose = "visit-track-v1";
    private static readonly TimeSpan ValidWindow = TimeSpan.FromMinutes(10);

    private readonly byte[] _key;
    private readonly ILogger<VisitTokenService> _logger;

    public VisitTokenService(IConfiguration config, ILogger<VisitTokenService> logger)
    {
        _logger = logger;
        var secret = config["VisitTracking:TokenSecret"];
        if (string.IsNullOrEmpty(secret))
        {
            // Derive a stable key from the machine + app name if unconfigured.
            // Tokens won't survive a service restart, which is fine — they only
            // need to last 10 minutes.
            secret = $"{Environment.MachineName}:beacon-visit-tokens:{Guid.NewGuid()}";
            _logger.LogWarning("VisitTracking:TokenSecret not configured; using ephemeral key");
        }
        _key = SHA256.HashData(Encoding.UTF8.GetBytes(secret));
    }

    public string Issue(string clientIp)
    {
        var issuedAt = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var nonce = RandomNumberGenerator.GetBytes(8);
        var nonceHex = Convert.ToHexString(nonce);
        var payload = $"{TokenPurpose}|{clientIp}|{issuedAt}|{nonceHex}";
        var sig = Convert.ToHexString(HMACSHA256.HashData(_key, Encoding.UTF8.GetBytes(payload)));
        return $"{issuedAt}.{nonceHex}.{sig}";
    }

    public bool Validate(string token, string clientIp, out string? failureReason)
    {
        failureReason = null;
        if (string.IsNullOrEmpty(token))
        {
            failureReason = "missing";
            return false;
        }

        var parts = token.Split('.');
        if (parts.Length != 3)
        {
            failureReason = "malformed";
            return false;
        }

        if (!long.TryParse(parts[0], out var issuedAt))
        {
            failureReason = "bad_timestamp";
            return false;
        }

        var age = DateTimeOffset.UtcNow.ToUnixTimeSeconds() - issuedAt;
        if (age < 0 || age > ValidWindow.TotalSeconds)
        {
            failureReason = "expired";
            return false;
        }

        var payload = $"{TokenPurpose}|{clientIp}|{parts[0]}|{parts[1]}";
        var expected = Convert.ToHexString(HMACSHA256.HashData(_key, Encoding.UTF8.GetBytes(payload)));
        if (!CryptographicOperations.FixedTimeEquals(
            Encoding.ASCII.GetBytes(expected),
            Encoding.ASCII.GetBytes(parts[2])))
        {
            failureReason = "bad_signature";
            return false;
        }

        return true;
    }
}
