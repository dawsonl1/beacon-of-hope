using backend.Data;
using backend.DTOs;
using backend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Stripe.Checkout;

namespace backend.Endpoints;

public static class DonorPortalEndpoints
{
    public static void MapDonorPortalEndpoints(this WebApplication app)
    {
        app.MapGet("/api/donor/my-donations", async (
            HttpContext httpContext,
            UserManager<ApplicationUser> userManager,
            AppDbContext db) =>
        {
            var appUser = await userManager.GetUserAsync(httpContext.User);
            if (appUser?.SupporterId == null)
                return Results.Ok(new { supporter = (object?)null, donations = Array.Empty<object>(), allocations = Array.Empty<object>() });

            var sid = appUser.SupporterId.Value;

            var supporter = await db.Supporters
                .Where(s => s.SupporterId == sid)
                .Select(s => new
                {
                    s.SupporterId,
                    s.DisplayName,
                    s.FirstName,
                    s.LastName,
                    s.SupporterType,
                    s.Status,
                    s.FirstDonationDate,
                })
                .FirstOrDefaultAsync();

            var donations = await db.Donations
                .Where(d => d.SupporterId == sid)
                .OrderByDescending(d => d.DonationDate)
                .Select(d => new
                {
                    d.DonationId,
                    d.DonationType,
                    d.DonationDate,
                    d.Amount,
                    d.EstimatedValue,
                    d.CurrencyCode,
                    d.IsRecurring,
                    d.CampaignName,
                    d.ChannelSource,
                })
                .ToListAsync();

            var donationIds = donations.Select(d => d.DonationId).ToList();

            var allocations = await db.DonationAllocations
                .Where(a => donationIds.Contains(a.DonationId))
                .Select(a => new
                {
                    a.DonationId,
                    a.ProgramArea,
                    a.AmountAllocated,
                    safehouseName = db.Safehouses
                        .Where(s => s.SafehouseId == a.SafehouseId)
                        .Select(s => s.Name ?? s.SafehouseCode)
                        .FirstOrDefault()
                })
                .ToListAsync();

            return Results.Ok(new { supporter, donations, allocations });
        }).RequireAuthorization();

        // ── Stripe donation endpoints ──────────────────────────────

        app.MapPost("/api/donate/create-checkout-session", async (HttpContext httpContext) =>
        {
            var body = await httpContext.Request.ReadFromJsonAsync<CreateCheckoutRequest>();
            if (body == null) return Results.BadRequest(new { error = "Request body is required." });
            var (valid, err) = DtoValidator.Validate(body);
            if (!valid) return Results.BadRequest(new { error = err });

            var origin = httpContext.Request.Headers.Origin.FirstOrDefault()
                      ?? "https://intex2-1.vercel.app";

            var options = new SessionCreateOptions
            {
                SuccessUrl = $"{origin}/donate/success?session_id={{CHECKOUT_SESSION_ID}}",
                CancelUrl = $"{origin}/donate",
                CustomerEmail = body.DonorEmail,
            };

            if (body.Mode == "one-time")
            {
                options.Mode = "payment";
                options.LineItems = new List<SessionLineItemOptions>
                {
                    new()
                    {
                        PriceData = new SessionLineItemPriceDataOptions
                        {
                            Currency = "usd",
                            UnitAmount = body.AmountCents,
                            ProductData = new SessionLineItemPriceDataProductDataOptions
                            {
                                Name = "One-Time Donation to Beacon of Hope"
                            }
                        },
                        Quantity = 1
                    }
                };
            }
            else
            {
                var interval = body.Cadence switch
                {
                    "quarterly" => "month",
                    "yearly" => "year",
                    _ => "month"
                };
                var intervalCount = body.Cadence == "quarterly" ? 3L : 1L;

                options.Mode = "subscription";
                options.LineItems = new List<SessionLineItemOptions>
                {
                    new()
                    {
                        PriceData = new SessionLineItemPriceDataOptions
                        {
                            Currency = "usd",
                            UnitAmount = body.AmountCents,
                            ProductData = new SessionLineItemPriceDataProductDataOptions
                            {
                                Name = "Recurring Donation to Beacon of Hope"
                            },
                            Recurring = new SessionLineItemPriceDataRecurringOptions
                            {
                                Interval = interval,
                                IntervalCount = intervalCount
                            }
                        },
                        Quantity = 1
                    }
                };
            }

            var service = new SessionService();
            var session = await service.CreateAsync(options);

            return Results.Ok(new { url = session.Url });
        });

        app.MapGet("/api/donate/success", async (string session_id, AppDbContext db) =>
        {
            var service = new SessionService();
            var session = await service.GetAsync(session_id);

            if (session.PaymentStatus != "paid" && session.Status != "complete")
                return Results.BadRequest(new { error = "Payment not completed." });

            // Idempotency: don't double-record
            var existing = await db.Donations.AnyAsync(d => d.Notes != null && d.Notes.Contains(session_id));
            if (!existing)
            {
                var donation = new backend.Models.Donation
                {
                    DonationType = "Monetary",
                    DonationDate = DateOnly.FromDateTime(DateTime.UtcNow),
                    ChannelSource = "Stripe",
                    CurrencyCode = "USD",
                    Amount = (session.AmountTotal ?? 0) / 100m,
                    IsRecurring = session.Mode == "subscription",
                    Notes = $"Stripe Session: {session_id}"
                };
                db.Donations.Add(donation);
                await db.SaveChangesAsync();
            }

            return Results.Ok(new
            {
                amount = (session.AmountTotal ?? 0) / 100m,
                currency = session.Currency?.ToUpper(),
                isRecurring = session.Mode == "subscription",
                email = session.CustomerEmail
            });
        });
    }
}
