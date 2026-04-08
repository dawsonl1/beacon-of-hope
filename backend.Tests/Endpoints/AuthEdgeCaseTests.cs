using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using backend.Tests.Helpers;
using FluentAssertions;

namespace backend.Tests.Endpoints;

/// <summary>
/// Auth edge cases: lockout, register, user lifecycle (create→delete→verify gone),
/// impact snapshots, and concurrent claim race condition.
/// </summary>
public class AuthEdgeCaseTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;
    public AuthEdgeCaseTests(TestWebApplicationFactory factory) => _factory = factory;

    // ════════════════════════════════════════════════════════════
    // ACCOUNT LOCKOUT
    // ════════════════════════════════════════════════════════════

    [Fact]
    public async Task Lockout_After5FailedAttempts()
    {
        var client = AuthHelper.GetAnonymousClient(_factory);

        // Fail 5 times
        for (int i = 0; i < 5; i++)
        {
            await client.PostAsJsonAsync("/api/auth/login", new
            {
                email = "admin@beaconofhope.org",
                password = $"WrongPassword{i}!",
                rememberMe = false
            });
        }

        // 6th attempt should be locked out even with correct password
        var resp = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "admin@beaconofhope.org",
            password = "Test1234!@#$",
            rememberMe = false
        });
        // Should not return OK — either 400 (BadRequest) or 423 (Locked)
        var status = (int)resp.StatusCode;
        status.Should().NotBe(200);
        status.Should().BeOneOf(400, 423);
    }

    // ════════════════════════════════════════════════════════════
    // REGISTER
    // ════════════════════════════════════════════════════════════

    [Fact]
    public async Task Register_ValidUser_ReturnsOk()
    {
        var client = AuthHelper.GetAnonymousClient(_factory);
        var email = $"newuser-{Guid.NewGuid():N}@test.org";
        var resp = await client.PostAsJsonAsync("/api/auth/register", new
        {
            firstName = "New",
            lastName = "User",
            email,
            password = "Test1234!@#$"
        });
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("email").GetString().Should().Be(email);
    }

    [Fact]
    public async Task Register_DuplicateEmail_ReturnsBadRequest()
    {
        var client = AuthHelper.GetAnonymousClient(_factory);
        var resp = await client.PostAsJsonAsync("/api/auth/register", new
        {
            firstName = "Dup",
            lastName = "User",
            email = "admin@beaconofhope.org",
            password = "Test1234!@#$"
        });
        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Register_WeakPassword_ReturnsBadRequest()
    {
        var client = AuthHelper.GetAnonymousClient(_factory);
        var resp = await client.PostAsJsonAsync("/api/auth/register", new
        {
            firstName = "Weak",
            lastName = "Pass",
            email = $"weak-{Guid.NewGuid():N}@test.org",
            password = "short"
        });
        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Register_MissingEmail_ReturnsBadRequest()
    {
        var client = AuthHelper.GetAnonymousClient(_factory);
        var resp = await client.PostAsJsonAsync("/api/auth/register", new
        {
            firstName = "No",
            lastName = "Email",
            email = "",
            password = "Test1234!@#$"
        });
        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // ════════════════════════════════════════════════════════════
    // USER LIFECYCLE: CREATE → VERIFY → DELETE → VERIFY GONE
    // ════════════════════════════════════════════════════════════

    [Fact]
    public async Task UserLifecycle_Create_Delete_VerifyGone()
    {
        var client = await AuthHelper.GetAdminClientAsync(_factory);
        var email = $"lifecycle-{Guid.NewGuid():N}@test.org";

        // Create
        var createResp = await client.PostAsJsonAsync("/api/admin/users", new
        {
            email,
            password = "Test1234!@#$",
            role = "Staff",
            firstName = "Lifecycle",
            lastName = "Test"
        });
        createResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var created = await createResp.Content.ReadFromJsonAsync<JsonElement>();
        var userId = created.GetProperty("id").GetString();

        // Verify exists in user list
        var users1 = await client.GetFromJsonAsync<JsonElement>("/api/admin/users");
        users1.EnumerateArray().Should().Contain(u => u.GetProperty("id").GetString() == userId);

        // Delete
        var deleteResp = await client.DeleteAsync($"/api/admin/users/{userId}");
        deleteResp.StatusCode.Should().Be(HttpStatusCode.OK);

        // Verify gone
        var users2 = await client.GetFromJsonAsync<JsonElement>("/api/admin/users");
        users2.EnumerateArray().Should().NotContain(u => u.GetProperty("id").GetString() == userId);
    }

    // ════════════════════════════════════════════════════════════
    // IMPACT SNAPSHOTS
    // ════════════════════════════════════════════════════════════

    [Fact]
    public async Task ImpactSnapshots_ReturnsArray()
    {
        var client = AuthHelper.GetAnonymousClient(_factory);
        var resp = await client.GetAsync("/api/impact/snapshots");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.Content.ReadFromJsonAsync<JsonElement>();
        body.ValueKind.Should().Be(JsonValueKind.Array);
    }

    // ════════════════════════════════════════════════════════════
    // CONCURRENT CLAIM — two users claiming same resident
    // ════════════════════════════════════════════════════════════

    [Fact]
    public async Task ConcurrentClaim_SecondClaimOverwrites()
    {
        var adminClient = await AuthHelper.GetAdminClientAsync(_factory);
        var staffClient = await AuthHelper.GetStaffClientAsync(_factory);

        // Create unclaimed resident
        var createResp = await adminClient.PostAsJsonAsync("/api/admin/residents", new
        {
            internalCode = $"CONC-{Guid.NewGuid():N}".Substring(0, 10),
            caseStatus = "Active"
        });
        var created = await createResp.Content.ReadFromJsonAsync<JsonElement>();
        var residentId = created.GetProperty("residentId").GetInt32();

        // Both claim simultaneously
        var task1 = adminClient.PostAsync($"/api/admin/residents/{residentId}/claim", null);
        var task2 = staffClient.PostAsync($"/api/admin/residents/{residentId}/claim", null);
        var results = await Task.WhenAll(task1, task2);

        // Both should succeed (last write wins)
        results[0].StatusCode.Should().Be(HttpStatusCode.OK);
        results[1].StatusCode.Should().Be(HttpStatusCode.OK);

        // Resident should have a social worker assigned
        var detail = await adminClient.GetFromJsonAsync<JsonElement>($"/api/admin/residents/{residentId}");
        detail.GetProperty("assignedSocialWorker").GetString().Should().NotBeNullOrEmpty();
    }
}
