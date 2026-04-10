using System.ComponentModel.DataAnnotations;

namespace backend.DTOs;

public class CreateOutreachRequest
{
    [Required]
    [RegularExpression("^(Email|Note)$", ErrorMessage = "OutreachType must be 'Email' or 'Note'.")]
    public string OutreachType { get; set; } = null!;

    [StringLength(2000)]
    public string? Note { get; set; }
}

public class UpdateOutreachRequest
{
    [StringLength(2000)]
    public string? Note { get; set; }
}
