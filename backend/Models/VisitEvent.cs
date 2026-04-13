namespace backend.Models;

public enum VisitVerdict
{
    Human,
    LikelyHuman,
    Uncertain,
    Bot,
}

// Operational visitor-tracking record. Timestamps use real UTC (not the frozen
// DataCutoff) — visit tracking is a real-time monitoring stream, not business
// data subject to the demo freeze.
public class VisitEvent
{
    public long Id { get; set; }
    public DateTime Timestamp { get; set; }

    // Identity
    public Guid VisitorId { get; set; }
    public string? FingerprintHash { get; set; }
    public string? IpHash { get; set; }
    public bool IsNewVisitor { get; set; }

    // Request
    public string Path { get; set; } = null!;
    public string? Referrer { get; set; }
    public string? UserAgent { get; set; }
    public string? Language { get; set; }
    public string? Timezone { get; set; }

    // Verdict
    public VisitVerdict Verdict { get; set; }
    public string? BotSignals { get; set; }
    public int? CfBotScore { get; set; }
    public int InteractionMs { get; set; }
    public int ScrollDepthPct { get; set; }

    // Geolocation
    public string? Country { get; set; }
    public string? City { get; set; }
    public string? Region { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public long? Asn { get; set; }
    public string? AsnOrg { get; set; }
}
