using System.ComponentModel.DataAnnotations;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SendGrid;
using SendGrid.Helpers.Mail;
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

        app.MapPost("/api/admin/newsletters/{id}/send", async (int id, AppDbContext db, IConfiguration config, ILoggerFactory loggerFactory) =>
        {
            var nl = await db.Newsletters.FindAsync(id);
            if (nl == null) return Results.NotFound();
            if (nl.Status != "approved") return Results.BadRequest(new { error = "Newsletter must be approved before sending." });

            var apiKey = config["SendGrid:ApiKey"];
            if (string.IsNullOrEmpty(apiKey))
            {
                nl.Status = "failed";
                await db.SaveChangesAsync();
                return Results.BadRequest(new { error = "SendGrid API key not configured." });
            }

            nl.Status = "sending";
            await db.SaveChangesAsync();

            var subscribers = await db.NewsletterSubscribers
                .Where(s => s.IsActive)
                .ToListAsync();

            var fromEmail = config["SendGrid:FromEmail"] ?? "noreply@beaconofhope.org";
            var fromName = config["SendGrid:FromName"] ?? "Beacon of Hope";
            var baseUrl = config["App:BaseUrl"] ?? "https://intex2-1.vercel.app";

            var client = new SendGridClient(apiKey);
            var from = new EmailAddress(fromEmail, fromName);
            int sent = 0;

            foreach (var sub in subscribers)
            {
                try
                {
                    var unsubUrl = $"{baseUrl}/api/newsletter/unsubscribe?token={sub.UnsubscribeToken}";
                    var html = (nl.HtmlContent ?? "").Replace("{{unsubscribe_url}}", unsubUrl)
                                                      .Replace("{{donate_url}}", $"{baseUrl}/donate");
                    var plain = (nl.PlainText ?? "").Replace("{{unsubscribe_url}}", unsubUrl)
                                                     .Replace("{{donate_url}}", $"{baseUrl}/donate");

                    var to = new EmailAddress(sub.Email);
                    var msg = MailHelper.CreateSingleEmail(from, to, nl.Subject ?? "Monthly Newsletter", plain, html);
                    var response = await client.SendEmailAsync(msg);

                    if (response.IsSuccessStatusCode)
                    {
                        sent++;
                    }
                    else
                    {
                        var body = await response.Body.ReadAsStringAsync();
                        loggerFactory.CreateLogger("NewsletterSend").LogError("SendGrid failed for {Email}: {Status} {Body}", sub.Email, response.StatusCode, body);
                    }
                }
                catch (Exception ex)
                {
                    loggerFactory.CreateLogger("NewsletterSend").LogError(ex, "Failed to send newsletter to {Email}", sub.Email);
                }
            }

            nl.Status = "sent";
            nl.SentAt = AppConstants.DataCutoffUtc;
            nl.RecipientCount = sent;
            await db.SaveChangesAsync();
            return Results.Ok(new { sent, total = subscribers.Count });
        }).RequireAuthorization(p => p.RequireRole("Admin"));

        // ── Admin: generate via AI harness ─────────────────────────────

        app.MapPost("/api/admin/newsletters/generate", async (AppDbContext db, IConfiguration config, ILoggerFactory loggerFactory) =>
        {
            var logger = loggerFactory.CreateLogger("NewsletterGenerate");
            var harnessUrl = config["AiHarness:Url"] ?? "http://localhost:8001";
            var harnessKey = config["AiHarness:ApiKey"] ?? "";

            logger.LogInformation("Generating newsletter via AI harness at {Url}", harnessUrl);

            using var httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(120) };
            if (!string.IsNullOrEmpty(harnessKey))
                httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {harnessKey}");

            HttpResponseMessage genResp;
            try
            {
                var now = AppConstants.DataCutoffUtc;
                genResp = await httpClient.PostAsJsonAsync($"{harnessUrl}/generate-newsletter",
                    new { year = now.Year, month = now.Month });
            }
            catch (TaskCanceledException)
            {
                logger.LogError("AI harness request timed out after 120s");
                return Results.BadRequest(new { error = "AI harness request timed out. The service may be starting up — try again in a minute." });
            }
            catch (HttpRequestException ex)
            {
                logger.LogError(ex, "Failed to reach AI harness at {Url}", harnessUrl);
                return Results.BadRequest(new { error = $"Cannot reach AI harness: {ex.Message}" });
            }

            if (!genResp.IsSuccessStatusCode)
            {
                var body = await genResp.Content.ReadAsStringAsync();
                logger.LogError("AI harness returned {Status}: {Body}", genResp.StatusCode, body);
                return Results.BadRequest(new { error = $"AI harness returned {genResp.StatusCode}: {body}" });
            }

            var genJson = await genResp.Content.ReadFromJsonAsync<JsonElement>();
            var now2 = AppConstants.DataCutoffUtc;

            var newsletter = new Newsletter
            {
                Subject = genJson.TryGetProperty("subject", out var s) ? s.GetString() : $"Beacon of Hope — {now2:MMMM yyyy}",
                HtmlContent = genJson.TryGetProperty("html_content", out var h) ? h.GetString() : null,
                PlainText = genJson.TryGetProperty("plain_text", out var p) ? p.GetString() : null,
                Status = "draft",
                GeneratedAt = AppConstants.DataCutoffUtc,
                MonthYear = now2.Year * 100 + now2.Month
            };

            db.Newsletters.Add(newsletter);
            await db.SaveChangesAsync();
            logger.LogInformation("Newsletter draft created: {Id}", newsletter.NewsletterId);
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
