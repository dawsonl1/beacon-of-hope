using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using backend.Tests.Helpers;

namespace backend.Tests.Endpoints.SocialMedia;

public class MediaLibraryTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public MediaLibraryTests(TestWebApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task CreateMediaItem_WithConsent_Persists()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.PostAsJsonAsync("/api/admin/social/media", new
        {
            filePath = "/media/library/test_photo.jpg",
            thumbnailPath = "/media/library/test_photo_thumb.jpg",
            caption = "Art therapy session",
            activityType = "art_therapy",
            consentConfirmed = true
        });
        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await resp.Content.ReadFromJsonAsync<JsonElement>();
        created.GetProperty("consentConfirmed").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task CreateMediaItem_WithoutConsent_Rejected()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var resp = await client.PostAsJsonAsync("/api/admin/social/media", new
        {
            filePath = "/media/library/no_consent.jpg",
            caption = "No consent given",
            activityType = "daily_life",
            consentConfirmed = false
        });
        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task ListMedia_FiltersByActivityType()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        await client.PostAsJsonAsync("/api/admin/social/media", new
        {
            filePath = "/media/library/sports1.jpg",
            caption = "Volleyball",
            activityType = "sports",
            consentConfirmed = true
        });
        await client.PostAsJsonAsync("/api/admin/social/media", new
        {
            filePath = "/media/library/meal1.jpg",
            caption = "Lunch",
            activityType = "meal",
            consentConfirmed = true
        });

        var resp = await client.GetFromJsonAsync<JsonElement>("/api/admin/social/media?activityType=sports");
        foreach (var item in resp.EnumerateArray())
        {
            item.GetProperty("activityType").GetString().Should().Be("sports");
        }
    }

    [Fact]
    public async Task DeleteMedia_AdminOnly()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var create = await client.PostAsJsonAsync("/api/admin/social/media", new
        {
            filePath = "/media/library/delete_me.jpg",
            caption = "Delete test",
            activityType = "other",
            consentConfirmed = true
        });
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("mediaLibraryItemId").GetInt32();

        var resp = await client.DeleteAsync($"/api/admin/social/media/{id}");
        resp.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task MediaUpload_AllowedForStaff()
    {
        var client = await AuthHelper.GetStaffClientAsync(_factory);
        var resp = await client.PostAsJsonAsync("/api/social/media/upload", new
        {
            filePath = "/media/library/staff_upload.jpg",
            caption = "Staff uploaded this",
            activityType = "daily_life",
            consentConfirmed = true
        });
        resp.StatusCode.Should().Be(HttpStatusCode.Created);
    }
}
