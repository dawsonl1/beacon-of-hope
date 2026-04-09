using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using backend.Tests.Helpers;

namespace backend.Tests.Endpoints.SocialMedia;

public class FinalGapTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public FinalGapTests(TestWebApplicationFactory factory) => _factory = factory;

    // ── Multipart File Upload ──────────────────────────────────

    [Fact]
    public async Task FileUpload_Multipart_WithConsent_Persists()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);

        // Create a tiny valid JPEG (smallest possible)
        var jpegBytes = CreateMinimalJpeg();

        using var content = new MultipartFormDataContent();
        content.Add(new ByteArrayContent(jpegBytes), "photo", "test.jpg");
        content.Add(new StringContent("Multipart test"), "caption");
        content.Add(new StringContent("art_therapy"), "activityType");
        content.Add(new StringContent("true"), "consentConfirmed");

        var resp = await client.PostAsync("/api/social/media/upload", content);
        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await resp.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("caption").GetString().Should().Be("Multipart test");
        body.GetProperty("filePath").GetString().Should().Contain("/media/library/");
        body.GetProperty("thumbnailPath").GetString().Should().Contain("thumb_");
    }

    [Fact]
    public async Task FileUpload_Multipart_WithoutConsent_Rejected()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var jpegBytes = CreateMinimalJpeg();

        using var content = new MultipartFormDataContent();
        content.Add(new ByteArrayContent(jpegBytes), "photo", "test.jpg");
        content.Add(new StringContent("No consent"), "caption");
        content.Add(new StringContent("false"), "consentConfirmed");

        var resp = await client.PostAsync("/api/social/media/upload", content);
        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task FileUpload_Multipart_NoFile_Rejected()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);

        using var content = new MultipartFormDataContent();
        content.Add(new StringContent("No file"), "caption");
        content.Add(new StringContent("true"), "consentConfirmed");

        var resp = await client.PostAsync("/api/social/media/upload", content);
        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // ── Hashtag Filter by Platform ─────────────────────────────

    [Fact]
    public async Task HashtagSets_FilterByPlatform()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        await client.PostAsJsonAsync("/api/admin/social/hashtag-sets", new
        {
            name = "Instagram only",
            category = "pillar_specific",
            pillar = "safehouse_life",
            platform = "instagram",
            hashtags = "[\"#insta\"]"
        });
        await client.PostAsJsonAsync("/api/admin/social/hashtag-sets", new
        {
            name = "Facebook only",
            category = "pillar_specific",
            pillar = "safehouse_life",
            platform = "facebook",
            hashtags = "[\"#fb\"]"
        });

        var resp = await client.GetFromJsonAsync<JsonElement>("/api/admin/social/hashtag-sets?platform=instagram");
        foreach (var item in resp.EnumerateArray())
        {
            var platform = item.GetProperty("platform").GetString();
            platform.Should().BeOneOf("instagram", "all");
        }
    }

    // ── Posts List No Filter ───────────────────────────────────

    [Fact]
    public async Task PostsList_NoFilter_ReturnsAll()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        await client.PostAsJsonAsync("/api/admin/social/posts", new
        {
            content = "Unfiltered test",
            contentPillar = "safehouse_life",
            source = "manual", status = "draft", platform = "instagram"
        });

        var resp = await client.GetFromJsonAsync<JsonElement>("/api/admin/social/posts");
        resp.GetArrayLength().Should().BeGreaterThanOrEqualTo(1);
    }

    // ── Awareness Date Range ───────────────────────────────────

    [Fact]
    public async Task AwarenessDates_WithDateRange_Persists()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.PostAsJsonAsync("/api/admin/social/awareness-dates", new
        {
            name = "Awareness Month",
            dateStart = "2026-01-01",
            dateEnd = "2026-01-31",
            recurrence = "annual",
            pillarEmphasis = "the_problem",
            description = "Full month event"
        });
        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await resp.Content.ReadFromJsonAsync<JsonElement>();
        created.GetProperty("dateEnd").GetString().Should().Contain("2026-01-31");
    }

    // ── Email Service: Settings-Based Skip ─────────────────────

    [Fact]
    public async Task Settings_InAppOnly_NoEmailField()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        await client.PutAsJsonAsync("/api/admin/social/settings", new
        {
            notificationMethod = "in_app",
            notificationEmail = ""
        });

        var get = await client.GetFromJsonAsync<JsonElement>("/api/admin/social/settings");
        get.GetProperty("notificationMethod").GetString().Should().Be("in_app");
    }

    // ── Generate Trigger: Harness Down Returns 503 ─────────────

    [Fact]
    public async Task GenerateTrigger_ReturnsOkOr503()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        // Returns 503 if harness is not running, OK if it is — both are valid in tests
        var resp = await client.PostAsJsonAsync("/api/admin/social/generate", new { maxPosts = 1 });
        resp.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.ServiceUnavailable);
    }

    // ── Helper: Create minimal JPEG ────────────────────────────

    private static byte[] CreateMinimalJpeg()
    {
        // Minimal valid JPEG: 1x1 pixel
        return new byte[]
        {
            0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
            0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
            0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
            0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
            0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
            0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
            0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
            0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
            0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
            0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
            0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
            0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
            0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
            0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xA1, 0x08,
            0x23, 0x42, 0xB1, 0xC1, 0x15, 0x52, 0xD1, 0xF0, 0x24, 0x33, 0x62, 0x72,
            0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x25, 0x26, 0x27, 0x28,
            0x29, 0x2A, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x43, 0x44, 0x45,
            0x46, 0x47, 0x48, 0x49, 0x4A, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
            0x5A, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x73, 0x74, 0x75,
            0x76, 0x77, 0x78, 0x79, 0x7A, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
            0x8A, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0xA2, 0xA3,
            0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6,
            0xB7, 0xB8, 0xB9, 0xBA, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9,
            0xCA, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xE1, 0xE2,
            0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA, 0xF1, 0xF2, 0xF3, 0xF4,
            0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01,
            0x00, 0x00, 0x3F, 0x00, 0x7B, 0x94, 0x11, 0x00, 0x00, 0x00, 0x00, 0x00,
            0xFF, 0xD9
        };
    }
}
