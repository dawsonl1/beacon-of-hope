namespace backend.Models;

public class UserSafehouse
{
    public int UserSafehouseId { get; set; }
    public string UserId { get; set; } = string.Empty;
    public int SafehouseId { get; set; }

    public virtual ApplicationUser User { get; set; } = null!;
    public virtual Safehouse Safehouse { get; set; } = null!;
}
