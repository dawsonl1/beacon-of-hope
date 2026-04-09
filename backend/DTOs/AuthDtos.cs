using System.ComponentModel.DataAnnotations;

namespace backend.DTOs;

public class LoginRequest
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;
    [Required, MinLength(12)]
    public string Password { get; set; } = string.Empty;
    public bool RememberMe { get; set; }
}

public class RegisterRequest
{
    [Required, StringLength(100)]
    public string FirstName { get; set; } = string.Empty;
    [Required, StringLength(100)]
    public string LastName { get; set; } = string.Empty;
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;
    [Required, MinLength(12)]
    public string Password { get; set; } = string.Empty;
}
