namespace backend.DTOs;

public class VolunteerSignupRequest
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Email { get; set; }
    public string? Region { get; set; }
}

public class PartnerSignupRequest
{
    public string? PartnerType { get; set; }
    public string? PartnerName { get; set; }
    public string? ContactName { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? RoleType { get; set; }
    public string? Notes { get; set; }
}

public class PartnerAdminRequest
{
    public string? PartnerName { get; set; }
    public string? PartnerType { get; set; }
    public string? RoleType { get; set; }
    public string? ContactName { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Region { get; set; }
    public string? Status { get; set; }
    public string? Notes { get; set; }
}
