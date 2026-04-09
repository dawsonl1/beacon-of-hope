using System.ComponentModel.DataAnnotations;

namespace backend.DTOs;

public class CreateUserRequest
{
    [Required, EmailAddress]
    public string Email { get; set; } = "";
    [Required]
    public string Password { get; set; } = "";
    [Required]
    public string Role { get; set; } = "Staff";
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public List<int>? SafehouseIds { get; set; }
}

public class UpdateSafehousesRequest { public List<int>? SafehouseIds { get; set; } }
