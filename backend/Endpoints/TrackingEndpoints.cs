using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using backend.Data;
using backend.Models;
using backend.Services;
using Microsoft.EntityFrameworkCore;

namespace backend.Endpoints;

public static class TrackingEndpoints
{
    public static void MapTrackingEndpoints(this WebApplication app)
    {
        // ── Token issuance ──────────────────────────────────────────
        // Called by the SPA on page load. Issues a short-lived HMAC-signed
        // token bound to the caller's IP. The beacon echoes this token back
        // when posting a visit.
        app.MapGet("/api/track/token", (HttpContext ctx, IVisitTokenService tokens) =>
        {
            var ip = ClientIp(ctx);
            return Results.Ok(new { token = tokens.Issue(ip) });
        });

        // ── Visit beacon ────────────────────────────────────────────
        app.MapPost("/api/track/visit", async (
            HttpContext ctx,
            AppDbContext db,
            IVisitTokenService tokens,
            IGeoIpService geo,
            IConfiguration config) =>
        {
            VisitPayload? body;
            try
            {
                body = await ctx.Request.ReadFromJsonAsync<VisitPayload>();
            }
            catch
            {
                return Results.BadRequest(new { error = "invalid_json" });
            }
            if (body is null) return Results.BadRequest(new { error = "missing_body" });

            var ip = ClientIp(ctx);
            if (!tokens.Validate(body.Token ?? "", ip, out var tokenFailure))
                return Results.BadRequest(new { error = "bad_token", reason = tokenFailure });

            // Cloudflare's bot score (1-99, lower = more bot-like). Absent
            // without a Bot Management plan, but harmless when missing.
            int? cfBotScore = null;
            if (int.TryParse(ctx.Request.Headers["cf-bot-score"].FirstOrDefault(), out var score))
                cfBotScore = score;

            var geoResult = geo.Lookup(ip);
            var verdict = AssignVerdict(body, cfBotScore);

            // Visitor ID: prefer the cookie UUID sent by the client; fall back
            // to a deterministic hash of the fingerprint so a cleared cookie
            // still lands on a stable visitor for the same browser; else mint
            // a fresh UUID.
            var (visitorId, isNew) = ResolveVisitorId(body);

            var ev = new VisitEvent
            {
                Timestamp = DateTime.UtcNow,
                VisitorId = visitorId,
                FingerprintHash = body.Fingerprint,
                IpHash = HashIp(ip, config["VisitTracking:IpHashSalt"]),
                IsNewVisitor = isNew,
                Path = Truncate(body.Path, 2048) ?? "/",
                Referrer = Truncate(body.Referrer, 2048),
                UserAgent = Truncate(ctx.Request.Headers.UserAgent.ToString(), 1024),
                Language = Truncate(body.Language, 32),
                Timezone = Truncate(body.Timezone, 64),
                Verdict = verdict,
                BotSignals = body.BotSignals is null ? null : JsonSerializer.Serialize(body.BotSignals),
                CfBotScore = cfBotScore,
                InteractionMs = body.InteractionMs,
                ScrollDepthPct = Math.Clamp(body.ScrollDepthPct, 0, 100),
                Country = geoResult.Country,
                City = geoResult.City,
                Region = geoResult.Region,
                Latitude = geoResult.Latitude,
                Longitude = geoResult.Longitude,
                Asn = geoResult.Asn,
                AsnOrg = Truncate(geoResult.AsnOrg, 256),
            };

            db.VisitEvents.Add(ev);
            await db.SaveChangesAsync();
            return Results.Ok(new { visitorId = ev.VisitorId });
        });
    }

    // ── Verdict logic ───────────────────────────────────────────────
    // Explicit bot evidence → bot. Strong human evidence (BotD clean AND real
    // interaction AND non-bot-like CF score) → human. Clean but no interaction
    // → uncertain. Anything in between → likely_human.
    internal static VisitVerdict AssignVerdict(VisitPayload p, int? cfBotScore)
    {
        if (p.BotdIsBot == true) return VisitVerdict.Bot;
        if (cfBotScore is not null and <= 10) return VisitVerdict.Bot;

        var hasInteraction = p.InteractionMs >= 2000 &&
                             (p.ScrollDepthPct > 0 || p.InteractionCount >= 1);

        var cfClean = cfBotScore is null || cfBotScore >= 30;

        if (p.BotdIsBot == false && hasInteraction && cfClean)
            return VisitVerdict.Human;

        if (p.BotdIsBot == false && cfClean)
            return VisitVerdict.LikelyHuman;

        return VisitVerdict.Uncertain;
    }

    private static (Guid visitorId, bool isNew) ResolveVisitorId(VisitPayload p)
    {
        if (!string.IsNullOrEmpty(p.CookieVisitorId) &&
            Guid.TryParse(p.CookieVisitorId, out var fromCookie))
            return (fromCookie, false);

        if (!string.IsNullOrEmpty(p.Fingerprint))
        {
            // Deterministic UUID from fingerprint — same browser maps to same
            // visitor even after cookie clear.
            var hash = SHA256.HashData(Encoding.UTF8.GetBytes("visitor:" + p.Fingerprint));
            return (new Guid(hash.AsSpan(0, 16)), true);
        }

        return (Guid.NewGuid(), true);
    }

    private static string? HashIp(string ip, string? salt)
    {
        if (string.IsNullOrEmpty(ip)) return null;
        var input = $"{salt ?? "beacon"}|{ip}";
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(input)))[..32];
    }

    private static string ClientIp(HttpContext ctx)
    {
        // Cloudflare sets cf-connecting-ip to the real origin; fall back to
        // X-Forwarded-For's first hop, then the direct remote address.
        var cf = ctx.Request.Headers["cf-connecting-ip"].FirstOrDefault();
        if (!string.IsNullOrEmpty(cf)) return cf;

        var xff = ctx.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrEmpty(xff))
            return xff.Split(',')[0].Trim();

        return ctx.Connection.RemoteIpAddress?.ToString() ?? "";
    }

    private static string? Truncate(string? s, int max) =>
        string.IsNullOrEmpty(s) ? s : (s.Length <= max ? s : s[..max]);
}

public sealed class VisitPayload
{
    public string? Token { get; set; }
    public string? CookieVisitorId { get; set; }
    public string? Fingerprint { get; set; }
    public string? Path { get; set; }
    public string? Referrer { get; set; }
    public string? Language { get; set; }
    public string? Timezone { get; set; }
    public bool? BotdIsBot { get; set; }
    public Dictionary<string, object>? BotSignals { get; set; }
    public int InteractionMs { get; set; }
    public int InteractionCount { get; set; }
    public int ScrollDepthPct { get; set; }
}
