using System.Text.Json;
using backend.Data;

namespace backend.Endpoints;

public static class ChatbotEndpoints
{
    public static void MapChatbotEndpoints(this WebApplication app)
    {
        app.MapPost("/api/chat/ask", async (
            HttpContext ctx,
            AppDbContext db,
            IConfiguration config,
            ILogger<Program> logger) =>
        {
            var requestId = Guid.NewGuid().ToString("N")[..8];
            var user = ctx.User.Identity?.Name ?? "unknown";

            // Read the user's safehouse access
            var allowed = await SafehouseAuth.GetAllowedSafehouseIds(ctx, db);

            // Parse the request body
            var body = await ctx.Request.ReadFromJsonAsync<JsonElement>();
            if (body.ValueKind == JsonValueKind.Undefined
                || !body.TryGetProperty("question", out var questionProp))
            {
                logger.LogWarning("[Chat:{RequestId}] Missing 'question' field from user {User}", requestId, user);
                return Results.BadRequest(new { error = "Missing 'question' field." });
            }
            var question = questionProp.GetString();
            if (string.IsNullOrWhiteSpace(question))
            {
                return Results.BadRequest(new { error = "Question cannot be empty." });
            }

            logger.LogInformation("[Chat:{RequestId}] User={User} Question=\"{Question}\" Safehouses={Safehouses}",
                requestId, user, question, allowed != null ? string.Join(",", allowed) : "all");

            // Build the request to forward to the Vanna service
            var vannaUrl = config["VannaService:Url"] ?? "http://localhost:8002";
            var vannaKey = config["VannaService:ApiKey"] ?? "";

            if (string.IsNullOrEmpty(vannaUrl) || vannaUrl == "http://localhost:8002")
            {
                logger.LogWarning("[Chat:{RequestId}] VannaService:Url is not configured (using default). Check appsettings.", requestId);
            }

            using var httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };
            if (!string.IsNullOrEmpty(vannaKey))
                httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {vannaKey}");
            httpClient.DefaultRequestHeaders.Add("X-Request-Id", requestId);

            var payload = new
            {
                question,
                safehouse_ids = allowed  // null for admins, List<int> for staff
            };

            try
            {
                logger.LogInformation("[Chat:{RequestId}] Forwarding to Vanna service at {Url}", requestId, vannaUrl);
                var resp = await httpClient.PostAsJsonAsync($"{vannaUrl}/ask", payload);

                var responseBody = await resp.Content.ReadAsStringAsync();

                if (!resp.IsSuccessStatusCode)
                {
                    logger.LogError("[Chat:{RequestId}] Vanna service returned {StatusCode}: {Body}",
                        requestId, (int)resp.StatusCode, responseBody);
                    return Results.Json(
                        new { error = "The data assistant is currently unavailable. Please try again later." },
                        statusCode: 503);
                }

                // Parse and check for application-level errors from Vanna
                var result = JsonSerializer.Deserialize<JsonElement>(responseBody);

                if (result.TryGetProperty("debug_error", out var debugError) && debugError.ValueKind == JsonValueKind.String)
                {
                    logger.LogWarning("[Chat:{RequestId}] Vanna error detail: {DebugError}", requestId, debugError.GetString());
                }

                if (result.TryGetProperty("error", out var errorProp) && errorProp.ValueKind == JsonValueKind.String)
                {
                    logger.LogWarning("[Chat:{RequestId}] Vanna returned error: {Error}", requestId, errorProp.GetString());
                }
                else
                {
                    logger.LogInformation("[Chat:{RequestId}] Success", requestId);
                }

                // Strip debug_error before sending to frontend
                if (result.TryGetProperty("debug_error", out _))
                {
                    var dict = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(responseBody)!;
                    dict.Remove("debug_error");
                    return Results.Ok(dict);
                }

                return Results.Ok(result);
            }
            catch (TaskCanceledException)
            {
                logger.LogError("[Chat:{RequestId}] Vanna service request timed out after 30s", requestId);
                return Results.Json(
                    new { error = "The query took too long. Try a simpler question." },
                    statusCode: 504);
            }
            catch (HttpRequestException ex)
            {
                logger.LogError(ex, "[Chat:{RequestId}] Failed to reach Vanna service at {Url}", requestId, vannaUrl);
                return Results.Json(
                    new { error = "The data assistant is currently unavailable. Please try again later." },
                    statusCode: 503);
            }
        }).RequireAuthorization(p => p.RequireRole("Admin", "Staff"));
    }
}
