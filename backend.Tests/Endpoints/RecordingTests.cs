using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using backend.Tests.Helpers;
using FluentAssertions;

namespace backend.Tests.Endpoints;

public class RecordingTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public RecordingTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private async Task<int> GetFirstResidentIdAsync(HttpClient client)
    {
        var response = await client.GetAsync("/api/admin/residents-list");
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var arr = body.EnumerateArray().ToArray();
        return arr.Length > 0 ? arr[0].GetProperty("residentId").GetInt32() : 0;
    }

    [Fact]
    public async Task ListRecordings_NoFilter_ReturnsAll()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/recordings?page=1&pageSize=20");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.TryGetProperty("items", out _).Should().BeTrue();
        body.TryGetProperty("totalCount", out _).Should().BeTrue();
    }

    [Fact]
    public async Task ListRecordings_FilterByResident()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var residentId = await GetFirstResidentIdAsync(client);
        if (residentId == 0) return;

        var response = await client.GetAsync($"/api/admin/recordings?residentId={residentId}&page=1&pageSize=20");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task ListRecordings_Chronological()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var response = await client.GetAsync("/api/admin/recordings?page=1&pageSize=20&sortBy=date_desc");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var items = body.GetProperty("items").EnumerateArray().ToArray();

        // date_desc means newest first
        if (items.Length > 1)
        {
            for (int i = 1; i < items.Length; i++)
            {
                var prev = items[i - 1].GetProperty("sessionDate");
                var curr = items[i].GetProperty("sessionDate");
                if (prev.ValueKind != JsonValueKind.Null && curr.ValueKind != JsonValueKind.Null)
                {
                    prev.GetString()!.CompareTo(curr.GetString()!).Should().BeGreaterThanOrEqualTo(0);
                }
            }
        }
    }

    [Fact]
    public async Task GetRecording_ReturnsAllFields()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var residentId = await GetFirstResidentIdAsync(client);
        if (residentId == 0) return;

        // Create a recording
        var createResponse = await client.PostAsJsonAsync("/api/admin/recordings", new
        {
            residentId,
            sessionDate = "2024-06-15",
            socialWorker = "Test Worker",
            sessionType = "Individual",
            sessionDurationMinutes = 45,
            emotionalStateObserved = "Anxious",
            emotionalStateEnd = "Calm",
            sessionNarrative = "Test narrative for recording detail"
        });
        var created = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("recordingId").GetInt32();

        var response = await client.GetAsync($"/api/admin/recordings/{id}");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        body.TryGetProperty("recordingId", out _).Should().BeTrue();
        body.TryGetProperty("residentId", out _).Should().BeTrue();
        body.TryGetProperty("sessionNarrative", out _).Should().BeTrue();
        body.TryGetProperty("socialWorker", out _).Should().BeTrue();
    }

    [Fact]
    public async Task CreateRecording_ValidData_ReturnsCreated()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var residentId = await GetFirstResidentIdAsync(client);
        if (residentId == 0) return;

        var response = await client.PostAsJsonAsync("/api/admin/recordings", new
        {
            residentId,
            sessionDate = "2024-07-01",
            socialWorker = "Test Worker",
            sessionType = "Group"
        });

        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.Created);
    }

    [Fact]
    public async Task CreateRecording_InvalidResident_ReturnsBadRequest()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var response = await client.PostAsJsonAsync("/api/admin/recordings", new
        {
            residentId = 99999,
            sessionDate = "2024-07-01",
            socialWorker = "Test Worker"
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateRecording_MissingResident_ReturnsBadRequest()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var response = await client.PostAsJsonAsync("/api/admin/recordings", new
        {
            residentId = 0,
            sessionDate = "2024-07-01"
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task UpdateRecording_Returns200()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var residentId = await GetFirstResidentIdAsync(client);
        if (residentId == 0) return;

        var createResponse = await client.PostAsJsonAsync("/api/admin/recordings", new
        {
            residentId,
            sessionDate = "2024-08-01",
            socialWorker = "Worker A"
        });
        var created = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("recordingId").GetInt32();

        var updateResponse = await client.PutAsJsonAsync($"/api/admin/recordings/{id}", new
        {
            residentId,
            sessionDate = "2024-08-02",
            socialWorker = "Worker B"
        });

        updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task DeleteRecording_Returns200()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var residentId = await GetFirstResidentIdAsync(client);
        if (residentId == 0) return;

        var createResponse = await client.PostAsJsonAsync("/api/admin/recordings", new
        {
            residentId,
            sessionDate = "2024-09-01",
            socialWorker = "Worker Del"
        });
        var created = await createResponse.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("recordingId").GetInt32();

        var deleteResponse = await client.DeleteAsync($"/api/admin/recordings/{id}");
        deleteResponse.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task EmotionalTrends_ReturnsTimeSeries()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var residentId = await GetFirstResidentIdAsync(client);
        if (residentId == 0) return;

        var response = await client.GetAsync($"/api/admin/recordings/emotional-trends?residentId={residentId}");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.ValueKind.Should().Be(JsonValueKind.Array);
    }

    [Fact]
    public async Task NarrativeField_LongText_Accepted()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var residentId = await GetFirstResidentIdAsync(client);
        if (residentId == 0) return;

        var longNarrative = new string('A', 10000);
        var response = await client.PostAsJsonAsync("/api/admin/recordings", new
        {
            residentId,
            sessionDate = "2024-10-01",
            socialWorker = "Worker Long",
            sessionNarrative = longNarrative
        });

        response.StatusCode.Should().BeOneOf(HttpStatusCode.OK, HttpStatusCode.Created);
    }

    [Fact]
    public async Task RecordingList_NarrativePreview_Truncated()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var residentId = await GetFirstResidentIdAsync(client);
        if (residentId == 0) return;

        // Create a recording with a long narrative
        var longNarrative = new string('X', 500);
        await client.PostAsJsonAsync("/api/admin/recordings", new
        {
            residentId,
            sessionDate = "2024-10-02",
            socialWorker = "Worker Preview",
            sessionNarrative = longNarrative
        });

        // List recordings and check narrative preview
        var response = await client.GetAsync($"/api/admin/recordings?residentId={residentId}&page=1&pageSize=50");
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var items = body.GetProperty("items").EnumerateArray().ToArray();

        foreach (var item in items)
        {
            if (item.TryGetProperty("narrativePreview", out var preview) &&
                preview.ValueKind == JsonValueKind.String)
            {
                preview.GetString()!.Length.Should().BeLessThanOrEqualTo(120);
            }
        }
    }
}
