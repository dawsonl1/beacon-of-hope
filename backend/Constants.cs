namespace backend;

// IMPORTANT: The entire app is frozen to February 16, 2026.
// All timestamps, "today" references, and record creation dates MUST use
// DataCutoff (DateOnly) or DataCutoffUtc (DateTime) — NEVER DateTime.UtcNow.
// DateTime.UtcNow is only acceptable for real timer scheduling math
// (e.g. calculating background job delays). See CLAUDE.md rule #9.
public static class AppConstants
{
    public static readonly DateOnly DataCutoff = new(2026, 2, 16);
    public static readonly DateTime DataCutoffUtc = new(2026, 2, 16, 0, 0, 0, DateTimeKind.Utc);
}
