using System.ComponentModel.DataAnnotations;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;

namespace backend.Endpoints;

public static class NewsletterEndpoints
{
    public static void MapNewsletterEndpoints(this WebApplication app)
    {
        // ── Public: subscribe ──────────────────────────────────────────

        app.MapPost("/api/newsletter/subscribe", async (HttpContext ctx, AppDbContext db) =>
        {
            var body = await ctx.Request.ReadFromJsonAsync<JsonElement>();
            if (body.ValueKind == JsonValueKind.Undefined) return Results.BadRequest();

            var email = body.TryGetProperty("email", out var e) ? e.GetString()?.Trim().ToLowerInvariant() : null;
            var name = body.TryGetProperty("name", out var n) ? n.GetString()?.Trim() : null;

            if (string.IsNullOrEmpty(email) || !email.Contains('@'))
                return Results.BadRequest(new { error = "Valid email is required." });

            var existing = await db.NewsletterSubscribers
                .FirstOrDefaultAsync(s => s.Email == email);

            if (existing != null)
            {
                existing.IsActive = true;
                existing.Name = name ?? existing.Name;
                await db.SaveChangesAsync();
                return Results.Ok(new { message = "Subscribed!" });
            }

            var sub = new NewsletterSubscriber
            {
                Email = email,
                Name = name,
                SubscribedAt = AppConstants.DataCutoffUtc,
                UnsubscribeToken = Guid.NewGuid().ToString("N"),
                IsActive = true
            };
            db.NewsletterSubscribers.Add(sub);
            await db.SaveChangesAsync();
            return Results.Ok(new { message = "Subscribed!" });
        });

        // ── Public: unsubscribe ────────────────────────────────────────

        app.MapGet("/api/newsletter/unsubscribe", async (string token, AppDbContext db) =>
        {
            if (string.IsNullOrEmpty(token)) return Results.BadRequest("Missing token.");

            var sub = await db.NewsletterSubscribers
                .FirstOrDefaultAsync(s => s.UnsubscribeToken == token);

            if (sub == null) return Results.NotFound("Subscriber not found.");

            sub.IsActive = false;
            await db.SaveChangesAsync();

            return Results.Content(
                "<html><body style='font-family:sans-serif;text-align:center;padding:60px'>" +
                "<h2>You've been unsubscribed</h2>" +
                "<p>You will no longer receive our monthly newsletter.</p></body></html>",
                "text/html");
        });

        // ── Admin: list newsletters ────────────────────────────────────

        app.MapGet("/api/admin/newsletters", async (int page, int pageSize, AppDbContext db) =>
        {
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 50);

            var query = db.Newsletters.OrderByDescending(n => n.GeneratedAt);
            var total = await query.CountAsync();
            var items = await query.Skip((page - 1) * pageSize).Take(pageSize)
                .Select(n => new
                {
                    n.NewsletterId, n.Subject, n.Status, n.GeneratedAt,
                    n.ApprovedBy, n.ApprovedAt, n.SentAt, n.RecipientCount, n.MonthYear
                })
                .ToListAsync();

            return Results.Ok(new { items, total, page, pageSize });
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        // ── Admin: get single newsletter ───────────────────────────────

        app.MapGet("/api/admin/newsletters/{id}", async (int id, AppDbContext db) =>
        {
            var nl = await db.Newsletters.FindAsync(id);
            return nl == null ? Results.NotFound() : Results.Ok(nl);
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));

        // ── Admin: update draft ────────────────────────────────────────

        app.MapPut("/api/admin/newsletters/{id}", async (int id, HttpContext ctx, AppDbContext db) =>
        {
            var nl = await db.Newsletters.FindAsync(id);
            if (nl == null) return Results.NotFound();
            if (nl.Status != "draft") return Results.BadRequest(new { error = "Only drafts can be edited." });

            var body = await ctx.Request.ReadFromJsonAsync<JsonElement>();
            if (body.TryGetProperty("subject", out var s)) nl.Subject = s.GetString();
            if (body.TryGetProperty("htmlContent", out var h)) nl.HtmlContent = h.GetString();
            if (body.TryGetProperty("plainText", out var p)) nl.PlainText = p.GetString();
            await db.SaveChangesAsync();
            return Results.Ok(nl);
        }).RequireAuthorization(p => p.RequireRole("Admin"));

        // ── Admin: approve ─────────────────────────────────────────────

        app.MapPost("/api/admin/newsletters/{id}/approve", async (int id, HttpContext ctx, AppDbContext db) =>
        {
            var nl = await db.Newsletters.FindAsync(id);
            if (nl == null) return Results.NotFound();
            if (nl.Status != "draft") return Results.BadRequest(new { error = "Only drafts can be approved." });

            nl.Status = "approved";
            nl.ApprovedBy = ctx.User.FindFirstValue(ClaimTypes.Email) ?? "admin";
            nl.ApprovedAt = AppConstants.DataCutoffUtc;
            await db.SaveChangesAsync();
            return Results.Ok(nl);
        }).RequireAuthorization(p => p.RequireRole("Admin"));

        // ── Admin: send ────────────────────────────────────────────────

        app.MapPost("/api/admin/newsletters/{id}/send", async (int id, AppDbContext db, IConfiguration config) =>
        {
            var nl = await db.Newsletters.FindAsync(id);
            if (nl == null) return Results.NotFound();
            if (nl.Status != "approved") return Results.BadRequest(new { error = "Newsletter must be approved before sending." });

            nl.Status = "sending";
            await db.SaveChangesAsync();

            var subscribers = await db.NewsletterSubscribers
                .Where(s => s.IsActive)
                .ToListAsync();

            var smtpHost = config["Smtp:Host"] ?? "";
            var smtpPort = int.TryParse(config["Smtp:Port"], out var p2) ? p2 : 587;
            var smtpUser = config["Smtp:Username"] ?? "";
            var smtpPass = config["Smtp:Password"] ?? "";
            var fromEmail = config["Smtp:From"] ?? "noreply@beaconofhope.org";
            var baseUrl = config["App:BaseUrl"] ?? "https://intex2-1.vercel.app";

            if (string.IsNullOrEmpty(smtpHost))
            {
                nl.Status = "failed";
                await db.SaveChangesAsync();
                return Results.BadRequest(new { error = "SMTP not configured." });
            }

            int sent = 0;
            using var smtp = new System.Net.Mail.SmtpClient(smtpHost, smtpPort)
            {
                Credentials = new System.Net.NetworkCredential(smtpUser, smtpPass),
                EnableSsl = true
            };

            foreach (var sub in subscribers)
            {
                try
                {
                    var unsubUrl = $"{baseUrl}/api/newsletter/unsubscribe?token={sub.UnsubscribeToken}";
                    var html = (nl.HtmlContent ?? "").Replace("{{unsubscribe_url}}", unsubUrl)
                                                      .Replace("{{donate_url}}", $"{baseUrl}/donate");
                    var plain = (nl.PlainText ?? "").Replace("{{unsubscribe_url}}", unsubUrl)
                                                     .Replace("{{donate_url}}", $"{baseUrl}/donate");

                    var msg = new System.Net.Mail.MailMessage(fromEmail, sub.Email, nl.Subject ?? "Monthly Newsletter", html)
                    {
                        IsBodyHtml = true
                    };
                    if (!string.IsNullOrEmpty(plain))
                        msg.AlternateViews.Add(System.Net.Mail.AlternateView.CreateAlternateViewFromString(plain, null, "text/plain"));

                    await smtp.SendMailAsync(msg);
                    sent++;
                }
                catch { /* log and continue */ }
            }

            nl.Status = "sent";
            nl.SentAt = AppConstants.DataCutoffUtc;
            nl.RecipientCount = sent;
            await db.SaveChangesAsync();
            return Results.Ok(new { sent, total = subscribers.Count });
        }).RequireAuthorization(p => p.RequireRole("Admin"));

        // ── Admin: generate via AI harness ─────────────────────────────

        app.MapPost("/api/admin/newsletters/generate", async (AppDbContext db, IConfiguration config) =>
        {
            var harnessUrl = config["AiHarness:Url"] ?? "http://localhost:8001";
            var harnessKey = config["AiHarness:ApiKey"] ?? "";

            using var httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(120) };
            if (!string.IsNullOrEmpty(harnessKey))
                httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {harnessKey}");

            var now = AppConstants.DataCutoffUtc;
            var genResp = await httpClient.PostAsJsonAsync($"{harnessUrl}/generate-newsletter",
                new { year = now.Year, month = now.Month });

            if (!genResp.IsSuccessStatusCode)
                return Results.BadRequest(new { error = $"AI harness returned {genResp.StatusCode}" });

            var genJson = await genResp.Content.ReadFromJsonAsync<JsonElement>();

            var newsletter = new Newsletter
            {
                Subject = genJson.TryGetProperty("subject", out var s) ? s.GetString() : $"Beacon of Hope — {now:MMMM yyyy}",
                HtmlContent = genJson.TryGetProperty("html_content", out var h) ? h.GetString() : null,
                PlainText = genJson.TryGetProperty("plain_text", out var p) ? p.GetString() : null,
                Status = "draft",
                GeneratedAt = AppConstants.DataCutoffUtc,
                MonthYear = now.Year * 100 + now.Month
            };

            db.Newsletters.Add(newsletter);
            await db.SaveChangesAsync();
            return Results.Created($"/api/admin/newsletters/{newsletter.NewsletterId}", newsletter);
        }).RequireAuthorization(p => p.RequireRole("Admin"));

        // ── Admin: subscriber list ─────────────────────────────────────

        app.MapGet("/api/admin/newsletter-subscribers", async (int page, int pageSize, AppDbContext db) =>
        {
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 50);

            var query = db.NewsletterSubscribers.OrderByDescending(s => s.SubscribedAt);
            var total = await query.CountAsync();
            var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
            return Results.Ok(new { items, total, page, pageSize });
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));
    }
}
