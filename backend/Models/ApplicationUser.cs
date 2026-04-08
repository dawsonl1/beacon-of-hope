using Microsoft.AspNetCore.Identity;

namespace backend.Models;

public class ApplicationUser : IdentityUser
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public int? SupporterId { get; set; }
    public virtual Supporter? Supporter { get; set; }
    public virtual ICollection<UserSafehouse> UserSafehouses { get; set; } = new List<UserSafehouse>();
    public virtual ICollection<StaffTask> StaffTasks { get; set; } = new List<StaffTask>();
    public virtual ICollection<CalendarEvent> CalendarEvents { get; set; } = new List<CalendarEvent>();
}
