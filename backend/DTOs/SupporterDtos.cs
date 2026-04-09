using System.ComponentModel.DataAnnotations;

namespace backend.DTOs;

public class SupporterRequest
{
    [StringLength(50)]
    public string? SupporterType { get; set; }
    [StringLength(200)]
    public string? DisplayName { get; set; }
    [StringLength(200)]
    public string? OrganizationName { get; set; }
    [StringLength(100)]
    public string? FirstName { get; set; }
    [StringLength(100)]
    public string? LastName { get; set; }
    [StringLength(50)]
    public string? RelationshipType { get; set; }
    [EmailAddress]
    public string? Email { get; set; }
    [Phone]
    public string? Phone { get; set; }
    [StringLength(100)]
    public string? Region { get; set; }
    [StringLength(100)]
    public string? Country { get; set; }
    [StringLength(50)]
    public string? Status { get; set; }
    [StringLength(100)]
    public string? AcquisitionChannel { get; set; }
}
