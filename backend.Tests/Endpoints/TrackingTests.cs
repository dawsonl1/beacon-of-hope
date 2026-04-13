using backend.Endpoints;
using backend.Models;
using backend.Services;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace backend.Tests.Endpoints;

public class VisitVerdictTests
{
    [Fact]
    public void BotD_flags_bot_returns_Bot()
    {
        var p = new VisitPayload { BotdIsBot = true, InteractionMs = 5000, ScrollDepthPct = 50 };
        TrackingEndpoints.AssignVerdict(p, cfBotScore: 80).Should().Be(VisitVerdict.Bot);
    }

    [Fact]
    public void Low_cf_bot_score_returns_Bot_even_without_BotD_flag()
    {
        var p = new VisitPayload { BotdIsBot = false, InteractionMs = 5000, ScrollDepthPct = 50 };
        TrackingEndpoints.AssignVerdict(p, cfBotScore: 5).Should().Be(VisitVerdict.Bot);
    }

    [Fact]
    public void Clean_BotD_plus_interaction_plus_clean_CF_returns_Human()
    {
        var p = new VisitPayload { BotdIsBot = false, InteractionMs = 3000, InteractionCount = 2, ScrollDepthPct = 40 };
        TrackingEndpoints.AssignVerdict(p, cfBotScore: 80).Should().Be(VisitVerdict.Human);
    }

    [Fact]
    public void Missing_cf_bot_score_still_allows_Human_verdict()
    {
        var p = new VisitPayload { BotdIsBot = false, InteractionMs = 3000, InteractionCount = 1, ScrollDepthPct = 20 };
        TrackingEndpoints.AssignVerdict(p, cfBotScore: null).Should().Be(VisitVerdict.Human);
    }

    [Fact]
    public void Clean_BotD_no_interaction_returns_LikelyHuman()
    {
        var p = new VisitPayload { BotdIsBot = false, InteractionMs = 1000, InteractionCount = 0, ScrollDepthPct = 0 };
        TrackingEndpoints.AssignVerdict(p, cfBotScore: 80).Should().Be(VisitVerdict.LikelyHuman);
    }

    [Fact]
    public void BotD_null_and_no_interaction_returns_Uncertain()
    {
        var p = new VisitPayload { BotdIsBot = null, InteractionMs = 500 };
        TrackingEndpoints.AssignVerdict(p, cfBotScore: 80).Should().Be(VisitVerdict.Uncertain);
    }

    [Fact]
    public void Borderline_cf_score_downgrades_to_Uncertain()
    {
        var p = new VisitPayload { BotdIsBot = false, InteractionMs = 3000, ScrollDepthPct = 50 };
        TrackingEndpoints.AssignVerdict(p, cfBotScore: 20).Should().Be(VisitVerdict.Uncertain);
    }
}

public class VisitTokenServiceTests
{
    private static IVisitTokenService NewService(string? secret = "test-secret")
    {
        var dict = new Dictionary<string, string?> { ["VisitTracking:TokenSecret"] = secret };
        var config = new ConfigurationBuilder().AddInMemoryCollection(dict).Build();
        return new VisitTokenService(config, NullLogger<VisitTokenService>.Instance);
    }

    [Fact]
    public void Round_trip_with_same_ip_validates()
    {
        var svc = NewService();
        var token = svc.Issue("1.2.3.4");
        svc.Validate(token, "1.2.3.4", out var reason).Should().BeTrue();
        reason.Should().BeNull();
    }

    [Fact]
    public void Token_bound_to_different_ip_is_rejected()
    {
        var svc = NewService();
        var token = svc.Issue("1.2.3.4");
        svc.Validate(token, "5.6.7.8", out var reason).Should().BeFalse();
        reason.Should().Be("bad_signature");
    }

    [Fact]
    public void Tampered_signature_is_rejected()
    {
        var svc = NewService();
        var token = svc.Issue("1.2.3.4");
        var parts = token.Split('.');
        var tampered = $"{parts[0]}.{parts[1]}.{new string('a', parts[2].Length)}";
        svc.Validate(tampered, "1.2.3.4", out var reason).Should().BeFalse();
        reason.Should().Be("bad_signature");
    }

    [Fact]
    public void Malformed_token_is_rejected()
    {
        var svc = NewService();
        svc.Validate("not-a-token", "1.2.3.4", out var reason).Should().BeFalse();
        reason.Should().Be("malformed");
    }

    [Fact]
    public void Missing_token_is_rejected()
    {
        var svc = NewService();
        svc.Validate("", "1.2.3.4", out var reason).Should().BeFalse();
        reason.Should().Be("missing");
    }

    [Fact]
    public void Different_secrets_do_not_validate_each_others_tokens()
    {
        var a = NewService("secret-A");
        var b = NewService("secret-B");
        var token = a.Issue("1.2.3.4");
        b.Validate(token, "1.2.3.4", out _).Should().BeFalse();
    }
}
