using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Data;

public static class DataSeeder
{
    public static async Task SeedAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // Only seed if the database is empty
        if (await db.Safehouses.AnyAsync()) return;

        // 1. Safehouses (9 rows - all required for FK references)
        var safehouses = new List<Safehouse>
        {
            new() { SafehouseId = 1, SafehouseCode = "SH01", Name = "Safehouse 1", Region = "Northern", City = "Dededo", Province = "Guam", Country = "USA", OpenDate = new DateOnly(2022, 1, 1), Status = "Active", CapacityGirls = 12, CapacityStaff = 4, CurrentOccupancy = 8, Notes = "[cap+4]" },
            new() { SafehouseId = 2, SafehouseCode = "SH02", Name = "Safehouse 2", Region = "Central", City = "Tamuning", Province = "Guam", Country = "USA", OpenDate = new DateOnly(2022, 2, 15), Status = "Active", CapacityGirls = 14, CapacityStaff = 5, CurrentOccupancy = 8, Notes = "[cap+4]" },
            new() { SafehouseId = 3, SafehouseCode = "SH03", Name = "Safehouse 3", Region = "Southern", City = "Inarajan", Province = "Guam", Country = "USA", OpenDate = new DateOnly(2022, 4, 1), Status = "Active", CapacityGirls = 13, CapacityStaff = 4, CurrentOccupancy = 9, Notes = "[cap+4]" },
            new() { SafehouseId = 4, SafehouseCode = "SH04", Name = "Safehouse 4", Region = "Central", City = "Mangilao", Province = "Guam", Country = "USA", OpenDate = new DateOnly(2022, 5, 16), Status = "Active", CapacityGirls = 16, CapacityStaff = 4, CurrentOccupancy = 12, Notes = "[cap+4]" },
            new() { SafehouseId = 5, SafehouseCode = "SH05", Name = "Safehouse 5", Region = "Northern", City = "Yigo", Province = "Guam", Country = "USA", OpenDate = new DateOnly(2022, 6, 30), Status = "Active", CapacityGirls = 15, CapacityStaff = 4, CurrentOccupancy = 9, Notes = "[cap+4]" },
            new() { SafehouseId = 6, SafehouseCode = "SH06", Name = "Safehouse 6", Region = "Central", City = "Barrigada", Province = "Guam", Country = "USA", OpenDate = new DateOnly(2022, 8, 14), Status = "Active", CapacityGirls = 12, CapacityStaff = 5, CurrentOccupancy = 6, Notes = "[cap+4]" },
            new() { SafehouseId = 7, SafehouseCode = "SH07", Name = "Safehouse 7", Region = "Southern", City = "Agat", Province = "Guam", Country = "USA", OpenDate = new DateOnly(2022, 9, 28), Status = "Active", CapacityGirls = 16, CapacityStaff = 4, CurrentOccupancy = 12, Notes = "[cap+4]" },
            new() { SafehouseId = 8, SafehouseCode = "SH08", Name = "Safehouse 8", Region = "Northern", City = "Hagatna", Province = "Guam", Country = "USA", OpenDate = new DateOnly(2022, 11, 12), Status = "Active", CapacityGirls = 13, CapacityStaff = 7, CurrentOccupancy = 7, Notes = "[cap+4]" },
            new() { SafehouseId = 9, SafehouseCode = "SH09", Name = "Safehouse 9", Region = "Southern", City = "Santa Rita", Province = "Guam", Country = "USA", OpenDate = new DateOnly(2022, 12, 27), Status = "Active", CapacityGirls = 10, CapacityStaff = 3, CurrentOccupancy = 6, Notes = "[cap+4]" },
        };
        db.Safehouses.AddRange(safehouses);
        await db.SaveChangesAsync();

        // 2. Partners (30 rows)
        var partners = new List<Partner>
        {
            new() { PartnerId = 1, PartnerName = "Ana Reyes", PartnerType = "Organization", RoleType = "SafehouseOps", ContactName = "Ana Reyes", Email = "ana-reyes@hopepartners.ph", Phone = "+63 993 532 6574", Region = "Luzon", Status = "Active", StartDate = new DateOnly(2022, 1, 1), EndDate = null, Notes = "Primary contractor" },
            new() { PartnerId = 2, PartnerName = "Maria Santos", PartnerType = "Individual", RoleType = "Evaluation", ContactName = "Maria Santos", Email = "maria-santos@pldt.net.ph", Phone = "+63 927 194 7224", Region = "Luzon", Status = "Active", StartDate = new DateOnly(2022, 1, 21), EndDate = null, Notes = "Primary contractor" },
            new() { PartnerId = 3, PartnerName = "Elena Cruz", PartnerType = "Individual", RoleType = "Education", ContactName = "Elena Cruz", Email = "elena-cruz@eastern.com.ph", Phone = "+63 966 926 1711", Region = "Mindanao", Status = "Active", StartDate = new DateOnly(2022, 2, 10), EndDate = null, Notes = "Primary contractor" },
            new() { PartnerId = 4, PartnerName = "Sofia Dizon", PartnerType = "Organization", RoleType = "Logistics", ContactName = "Sofia Dizon", Email = "sofia-dizon@bayanihanfoundation.ph", Phone = "+63 947 400 6925", Region = "Visayas", Status = "Active", StartDate = new DateOnly(2022, 3, 2), EndDate = null, Notes = "Primary contractor" },
            new() { PartnerId = 5, PartnerName = "Grace Flores", PartnerType = "Individual", RoleType = "SafehouseOps", ContactName = "Grace Flores", Email = "grace-flores@yahoo.com.ph", Phone = "+63 991 333 5741", Region = "Visayas", Status = "Active", StartDate = new DateOnly(2022, 3, 22), EndDate = null, Notes = "Primary contractor" },
            new() { PartnerId = 6, PartnerName = "Joy Garcia", PartnerType = "Individual", RoleType = "Maintenance", ContactName = "Joy Garcia", Email = "joy-garcia@yahoo.com.ph", Phone = "+63 995 384 8428", Region = "Mindanao", Status = "Active", StartDate = new DateOnly(2022, 4, 11), EndDate = null, Notes = "Primary contractor" },
            new() { PartnerId = 7, PartnerName = "Lina Mendoza", PartnerType = "Organization", RoleType = "FindSafehouse", ContactName = "Lina Mendoza", Email = "lina-mendoza@unityalliance.ph", Phone = "+63 955 786 5374", Region = "Luzon", Status = "Active", StartDate = new DateOnly(2022, 5, 1), EndDate = null, Notes = "Primary contractor" },
            new() { PartnerId = 8, PartnerName = "Noel Torres", PartnerType = "Individual", RoleType = "Logistics", ContactName = "Noel Torres", Email = "noel-torres@yahoo.com.ph", Phone = "+63 951 750 3803", Region = "Visayas", Status = "Active", StartDate = new DateOnly(2022, 5, 21), EndDate = null, Notes = "Primary contractor" },
            new() { PartnerId = 9, PartnerName = "Mark Lopez", PartnerType = "Individual", RoleType = "SafehouseOps", ContactName = "Mark Lopez", Email = "mark-lopez@smart.com.ph", Phone = "+63 995 376 4598", Region = "Luzon", Status = "Active", StartDate = new DateOnly(2022, 6, 10), EndDate = null, Notes = "Primary contractor" },
            new() { PartnerId = 10, PartnerName = "Ramon Bautista", PartnerType = "Organization", RoleType = "Logistics", ContactName = "Ramon Bautista", Email = "ramon-bautista@hopepartners.ph", Phone = "+63 915 924 6168", Region = "Mindanao", Status = "Active", StartDate = new DateOnly(2022, 6, 30), EndDate = null, Notes = "Primary contractor" },
            new() { PartnerId = 11, PartnerName = "Paolo Navarro", PartnerType = "Individual", RoleType = "SafehouseOps", ContactName = "Paolo Navarro", Email = "paolo-navarro@eastern.com.ph", Phone = "+63 977 317 9179", Region = "Luzon", Status = "Active", StartDate = new DateOnly(2022, 7, 20), EndDate = null, Notes = "Secondary contractor" },
            new() { PartnerId = 12, PartnerName = "Jessa Ramos", PartnerType = "Individual", RoleType = "SafehouseOps", ContactName = "Jessa Ramos", Email = "jessa-ramos@smart.com.ph", Phone = "+63 937 371 3287", Region = "Mindanao", Status = "Active", StartDate = new DateOnly(2022, 8, 9), EndDate = null, Notes = "Secondary contractor" },
            new() { PartnerId = 13, PartnerName = "Mica Castillo", PartnerType = "Organization", RoleType = "Evaluation", ContactName = "Mica Castillo", Email = "mica-castillo@faithgroup.ph", Phone = "+63 949 508 6930", Region = "Visayas", Status = "Active", StartDate = new DateOnly(2022, 8, 29), EndDate = null, Notes = "Secondary contractor" },
            new() { PartnerId = 14, PartnerName = "Leah Gomez", PartnerType = "Individual", RoleType = "Education", ContactName = "Leah Gomez", Email = "leah-gomez@eastern.com.ph", Phone = "+63 928 193 1771", Region = "Mindanao", Status = "Active", StartDate = new DateOnly(2022, 9, 18), EndDate = null, Notes = "Secondary contractor" },
            new() { PartnerId = 15, PartnerName = "Ruth Naval", PartnerType = "Individual", RoleType = "Transport", ContactName = "Ruth Naval", Email = "ruth-naval@globe.com.ph", Phone = "+63 992 532 2040", Region = "Luzon", Status = "Active", StartDate = new DateOnly(2022, 10, 8), EndDate = null, Notes = "Secondary contractor" },
            new() { PartnerId = 16, PartnerName = "Ivan Pascual", PartnerType = "Organization", RoleType = "SafehouseOps", ContactName = "Ivan Pascual", Email = "ivan-pascual@kapatiranalliance.ph", Phone = "+63 947 981 1188", Region = "Visayas", Status = "Active", StartDate = new DateOnly(2022, 10, 28), EndDate = null, Notes = "Secondary contractor" },
            new() { PartnerId = 17, PartnerName = "Aiko Rivera", PartnerType = "Individual", RoleType = "Logistics", ContactName = "Aiko Rivera", Email = "aiko-rivera@eastern.com.ph", Phone = "+63 967 887 6573", Region = "Luzon", Status = "Active", StartDate = new DateOnly(2022, 11, 17), EndDate = null, Notes = "Secondary contractor" },
            new() { PartnerId = 18, PartnerName = "Mara Salazar", PartnerType = "Individual", RoleType = "Education", ContactName = "Mara Salazar", Email = "mara-salazar@smart.com.ph", Phone = "+63 905 839 5315", Region = "Luzon", Status = "Active", StartDate = new DateOnly(2022, 12, 7), EndDate = null, Notes = "Secondary contractor" },
            new() { PartnerId = 19, PartnerName = "Paula Tan", PartnerType = "Organization", RoleType = "Maintenance", ContactName = "Paula Tan", Email = "paula-tan@brightalliance.ph", Phone = "+63 998 619 4258", Region = "Mindanao", Status = "Active", StartDate = new DateOnly(2022, 12, 27), EndDate = null, Notes = "Secondary contractor" },
            new() { PartnerId = 20, PartnerName = "Chris Uy", PartnerType = "Individual", RoleType = "Education", ContactName = "Chris Uy", Email = "chris-uy@eastern.com.ph", Phone = "+63 939 100 6310", Region = "Mindanao", Status = "Active", StartDate = new DateOnly(2023, 1, 16), EndDate = null, Notes = "Secondary contractor" },
            new() { PartnerId = 21, PartnerName = "Ben Diaz", PartnerType = "Individual", RoleType = "SafehouseOps", ContactName = "Ben Diaz", Email = "ben-diaz@pldt.net.ph", Phone = "+63 976 345 1949", Region = "Luzon", Status = "Active", StartDate = new DateOnly(2023, 2, 5), EndDate = null, Notes = "Secondary contractor" },
            new() { PartnerId = 22, PartnerName = "Kai Javier", PartnerType = "Organization", RoleType = "Evaluation", ContactName = "Kai Javier", Email = "kai-javier@brightfoundation.ph", Phone = "+63 928 935 2133", Region = "Visayas", Status = "Active", StartDate = new DateOnly(2023, 2, 25), EndDate = null, Notes = "Secondary contractor" },
            new() { PartnerId = 23, PartnerName = "Tess Lim", PartnerType = "Individual", RoleType = "Maintenance", ContactName = "Tess Lim", Email = "tess-lim@globe.com.ph", Phone = "+63 936 775 8787", Region = "Visayas", Status = "Active", StartDate = new DateOnly(2023, 3, 17), EndDate = null, Notes = "Secondary contractor" },
            new() { PartnerId = 24, PartnerName = "Nina Vega", PartnerType = "Individual", RoleType = "Maintenance", ContactName = "Nina Vega", Email = "nina-vega@eastern.com.ph", Phone = "+63 951 533 4470", Region = "Luzon", Status = "Active", StartDate = new DateOnly(2023, 4, 6), EndDate = null, Notes = "Secondary contractor" },
            new() { PartnerId = 25, PartnerName = "Rico Ramos", PartnerType = "Organization", RoleType = "Maintenance", ContactName = "Rico Ramos", Email = "rico-ramos@globalalliance.ph", Phone = "+63 996 787 7118", Region = "Mindanao", Status = "Active", StartDate = new DateOnly(2023, 4, 26), EndDate = null, Notes = "Secondary contractor" },
            new() { PartnerId = 26, PartnerName = "Maya Serrano", PartnerType = "Individual", RoleType = "SafehouseOps", ContactName = "Maya Serrano", Email = "maya-serrano@yahoo.com.ph", Phone = "+63 965 330 2049", Region = "Visayas", Status = "Active", StartDate = new DateOnly(2023, 5, 16), EndDate = null, Notes = "Secondary contractor" },
            new() { PartnerId = 27, PartnerName = "Ivy Valdez", PartnerType = "Individual", RoleType = "Evaluation", ContactName = "Ivy Valdez", Email = "ivy-valdez@globe.com.ph", Phone = "+63 949 325 1117", Region = "Visayas", Status = "Active", StartDate = new DateOnly(2023, 6, 5), EndDate = null, Notes = "Secondary contractor" },
            new() { PartnerId = 28, PartnerName = "Paul Yap", PartnerType = "Organization", RoleType = "Education", ContactName = "Paul Yap", Email = "paul-yap@globalfoundation.ph", Phone = "+63 915 980 6413", Region = "Visayas", Status = "Inactive", StartDate = new DateOnly(2023, 6, 25), EndDate = new DateOnly(2025, 12, 31), Notes = "Secondary contractor" },
            new() { PartnerId = 29, PartnerName = "June Cortez", PartnerType = "Individual", RoleType = "Education", ContactName = "June Cortez", Email = "june-cortez@smart.com.ph", Phone = "+63 955 652 3167", Region = "Luzon", Status = "Inactive", StartDate = new DateOnly(2023, 7, 15), EndDate = new DateOnly(2025, 12, 31), Notes = "Secondary contractor" },
            new() { PartnerId = 30, PartnerName = "Lara Soriano", PartnerType = "Individual", RoleType = "Logistics", ContactName = "Lara Soriano", Email = "lara-soriano@eastern.com.ph", Phone = "+63 921 348 8749", Region = "Mindanao", Status = "Inactive", StartDate = new DateOnly(2023, 8, 4), EndDate = new DateOnly(2025, 12, 31), Notes = "Secondary contractor" },
        };
        db.Partners.AddRange(partners);
        await db.SaveChangesAsync();

        // 3. Partner Assignments (30 rows)
        var partnerAssignments = new List<PartnerAssignment>
        {
            new() { AssignmentId = 1, PartnerId = 1, SafehouseId = 8, ProgramArea = "Operations", AssignmentStart = new DateOnly(2022, 1, 1), AssignmentEnd = null, ResponsibilityNotes = "SafehouseOps support for safehouse operations", IsPrimary = true, Status = "Active" },
            new() { AssignmentId = 2, PartnerId = 1, SafehouseId = 9, ProgramArea = "Operations", AssignmentStart = new DateOnly(2022, 1, 1), AssignmentEnd = null, ResponsibilityNotes = "SafehouseOps support for safehouse operations", IsPrimary = false, Status = "Active" },
            new() { AssignmentId = 3, PartnerId = 2, SafehouseId = 4, ProgramArea = "Wellbeing", AssignmentStart = new DateOnly(2022, 1, 21), AssignmentEnd = null, ResponsibilityNotes = "Evaluation support for safehouse operations", IsPrimary = true, Status = "Active" },
            new() { AssignmentId = 4, PartnerId = 3, SafehouseId = 9, ProgramArea = "Education", AssignmentStart = new DateOnly(2022, 2, 10), AssignmentEnd = null, ResponsibilityNotes = "Education support for safehouse operations", IsPrimary = true, Status = "Active" },
            new() { AssignmentId = 5, PartnerId = 3, SafehouseId = 6, ProgramArea = "Education", AssignmentStart = new DateOnly(2022, 2, 10), AssignmentEnd = null, ResponsibilityNotes = "Education support for safehouse operations", IsPrimary = false, Status = "Active" },
            new() { AssignmentId = 6, PartnerId = 4, SafehouseId = 8, ProgramArea = "Transport", AssignmentStart = new DateOnly(2022, 3, 2), AssignmentEnd = null, ResponsibilityNotes = "Logistics support for safehouse operations", IsPrimary = true, Status = "Active" },
            new() { AssignmentId = 7, PartnerId = 5, SafehouseId = 2, ProgramArea = "Operations", AssignmentStart = new DateOnly(2022, 3, 22), AssignmentEnd = null, ResponsibilityNotes = "SafehouseOps support for safehouse operations", IsPrimary = true, Status = "Active" },
            new() { AssignmentId = 8, PartnerId = 6, SafehouseId = null, ProgramArea = "Maintenance", AssignmentStart = new DateOnly(2022, 4, 11), AssignmentEnd = null, ResponsibilityNotes = "Maintenance support for safehouse operations", IsPrimary = true, Status = "Active" },
            new() { AssignmentId = 9, PartnerId = 7, SafehouseId = 8, ProgramArea = "Operations", AssignmentStart = new DateOnly(2022, 5, 1), AssignmentEnd = null, ResponsibilityNotes = "FindSafehouse support for safehouse operations", IsPrimary = true, Status = "Active" },
            new() { AssignmentId = 10, PartnerId = 7, SafehouseId = null, ProgramArea = "Operations", AssignmentStart = new DateOnly(2022, 5, 1), AssignmentEnd = null, ResponsibilityNotes = "FindSafehouse support for safehouse operations", IsPrimary = false, Status = "Active" },
            new() { AssignmentId = 11, PartnerId = 8, SafehouseId = null, ProgramArea = "Transport", AssignmentStart = new DateOnly(2022, 5, 21), AssignmentEnd = null, ResponsibilityNotes = "Logistics support for safehouse operations", IsPrimary = true, Status = "Active" },
            new() { AssignmentId = 12, PartnerId = 9, SafehouseId = 6, ProgramArea = "Operations", AssignmentStart = new DateOnly(2022, 6, 10), AssignmentEnd = null, ResponsibilityNotes = "SafehouseOps support for safehouse operations", IsPrimary = true, Status = "Active" },
            new() { AssignmentId = 13, PartnerId = 9, SafehouseId = 3, ProgramArea = "Operations", AssignmentStart = new DateOnly(2022, 6, 10), AssignmentEnd = null, ResponsibilityNotes = "SafehouseOps support for safehouse operations", IsPrimary = false, Status = "Active" },
            new() { AssignmentId = 14, PartnerId = 10, SafehouseId = null, ProgramArea = "Transport", AssignmentStart = new DateOnly(2022, 6, 30), AssignmentEnd = null, ResponsibilityNotes = "Logistics support for safehouse operations", IsPrimary = true, Status = "Active" },
            new() { AssignmentId = 15, PartnerId = 11, SafehouseId = 3, ProgramArea = "Operations", AssignmentStart = new DateOnly(2022, 7, 20), AssignmentEnd = null, ResponsibilityNotes = "SafehouseOps support for safehouse operations", IsPrimary = true, Status = "Active" },
            new() { AssignmentId = 16, PartnerId = 11, SafehouseId = 8, ProgramArea = "Operations", AssignmentStart = new DateOnly(2022, 7, 20), AssignmentEnd = null, ResponsibilityNotes = "SafehouseOps support for safehouse operations", IsPrimary = false, Status = "Active" },
            new() { AssignmentId = 17, PartnerId = 12, SafehouseId = 8, ProgramArea = "Operations", AssignmentStart = new DateOnly(2022, 8, 9), AssignmentEnd = null, ResponsibilityNotes = "SafehouseOps support for safehouse operations", IsPrimary = true, Status = "Active" },
            new() { AssignmentId = 18, PartnerId = 13, SafehouseId = 1, ProgramArea = "Wellbeing", AssignmentStart = new DateOnly(2022, 8, 29), AssignmentEnd = null, ResponsibilityNotes = "Evaluation support for safehouse operations", IsPrimary = true, Status = "Active" },
            new() { AssignmentId = 19, PartnerId = 14, SafehouseId = 2, ProgramArea = "Education", AssignmentStart = new DateOnly(2022, 9, 18), AssignmentEnd = null, ResponsibilityNotes = "Education support for safehouse operations", IsPrimary = true, Status = "Active" },
            new() { AssignmentId = 20, PartnerId = 14, SafehouseId = 7, ProgramArea = "Education", AssignmentStart = new DateOnly(2022, 9, 18), AssignmentEnd = null, ResponsibilityNotes = "Education support for safehouse operations", IsPrimary = false, Status = "Active" },
            new() { AssignmentId = 21, PartnerId = 15, SafehouseId = null, ProgramArea = "Transport", AssignmentStart = new DateOnly(2022, 10, 8), AssignmentEnd = null, ResponsibilityNotes = "Transport support for safehouse operations", IsPrimary = true, Status = "Active" },
            new() { AssignmentId = 22, PartnerId = 15, SafehouseId = 2, ProgramArea = "Transport", AssignmentStart = new DateOnly(2022, 10, 8), AssignmentEnd = null, ResponsibilityNotes = "Transport support for safehouse operations", IsPrimary = false, Status = "Active" },
            new() { AssignmentId = 23, PartnerId = 16, SafehouseId = 4, ProgramArea = "Operations", AssignmentStart = new DateOnly(2022, 10, 28), AssignmentEnd = null, ResponsibilityNotes = "SafehouseOps support for safehouse operations", IsPrimary = true, Status = "Active" },
            new() { AssignmentId = 24, PartnerId = 16, SafehouseId = 7, ProgramArea = "Operations", AssignmentStart = new DateOnly(2022, 10, 28), AssignmentEnd = null, ResponsibilityNotes = "SafehouseOps support for safehouse operations", IsPrimary = false, Status = "Active" },
            new() { AssignmentId = 25, PartnerId = 17, SafehouseId = null, ProgramArea = "Transport", AssignmentStart = new DateOnly(2022, 11, 17), AssignmentEnd = null, ResponsibilityNotes = "Logistics support for safehouse operations", IsPrimary = true, Status = "Active" },
            new() { AssignmentId = 26, PartnerId = 17, SafehouseId = 1, ProgramArea = "Transport", AssignmentStart = new DateOnly(2022, 11, 17), AssignmentEnd = null, ResponsibilityNotes = "Logistics support for safehouse operations", IsPrimary = false, Status = "Active" },
            new() { AssignmentId = 27, PartnerId = 17, SafehouseId = 9, ProgramArea = "Transport", AssignmentStart = new DateOnly(2022, 11, 17), AssignmentEnd = null, ResponsibilityNotes = "Logistics support for safehouse operations", IsPrimary = false, Status = "Active" },
            new() { AssignmentId = 28, PartnerId = 18, SafehouseId = 2, ProgramArea = "Education", AssignmentStart = new DateOnly(2022, 12, 7), AssignmentEnd = null, ResponsibilityNotes = "Education support for safehouse operations", IsPrimary = true, Status = "Active" },
            new() { AssignmentId = 29, PartnerId = 18, SafehouseId = 3, ProgramArea = "Education", AssignmentStart = new DateOnly(2022, 12, 7), AssignmentEnd = null, ResponsibilityNotes = "Education support for safehouse operations", IsPrimary = false, Status = "Active" },
            new() { AssignmentId = 30, PartnerId = 19, SafehouseId = 7, ProgramArea = "Maintenance", AssignmentStart = new DateOnly(2022, 12, 27), AssignmentEnd = null, ResponsibilityNotes = "Maintenance support for safehouse operations", IsPrimary = true, Status = "Active" },
        };
        db.PartnerAssignments.AddRange(partnerAssignments);
        await db.SaveChangesAsync();

        // 4. Supporters (30 rows)
        var supporters = new List<Supporter>
        {
            new() { SupporterId = 1, SupporterType = "MonetaryDonor", DisplayName = "Maria Chen", OrganizationName = null, FirstName = "Maria", LastName = "Chen", RelationshipType = "International", Region = "Northern", Country = "USA", Email = "donor@beaconofhope.org", Phone = "+1 (671) 555-0142", Status = "Active", FirstDonationDate = new DateOnly(2023, 7, 2), AcquisitionChannel = "Website", CreatedAt = new DateTime(2022, 1, 1) },
            new() { SupporterId = 2, SupporterType = "Volunteer", DisplayName = "Aria Brown", OrganizationName = null, FirstName = "Aria", LastName = "Brown", RelationshipType = "Local", Region = "Mindanao", Country = "Philippines", Email = "aria-brown@pldt.net.ph", Phone = "+63 927 354 4139", Status = "Active", FirstDonationDate = new DateOnly(2023, 9, 25), AcquisitionChannel = "SocialMedia", CreatedAt = new DateTime(2022, 1, 6) },
            new() { SupporterId = 3, SupporterType = "MonetaryDonor", DisplayName = "Noah Chen", OrganizationName = null, FirstName = "Noah", LastName = "Chen", RelationshipType = "Local", Region = "Luzon", Country = "Philippines", Email = "noah-chen@globe.com.ph", Phone = "+63 917 553 2604", Status = "Active", FirstDonationDate = new DateOnly(2023, 6, 25), AcquisitionChannel = "SocialMedia", CreatedAt = new DateTime(2022, 1, 11) },
            new() { SupporterId = 4, SupporterType = "MonetaryDonor", DisplayName = "Liam Diaz", OrganizationName = null, FirstName = "Liam", LastName = "Diaz", RelationshipType = "PartnerOrganization", Region = "Mindanao", Country = "Philippines", Email = "liam-diaz@globe.com.ph", Phone = "+63 945 516 8956", Status = "Active", FirstDonationDate = new DateOnly(2026, 3, 1), AcquisitionChannel = "Church", CreatedAt = new DateTime(2022, 1, 16) },
            new() { SupporterId = 5, SupporterType = "InKindDonor", DisplayName = "Emma Evans", OrganizationName = null, FirstName = "Emma", LastName = "Evans", RelationshipType = "PartnerOrganization", Region = "Mindanao", Country = "Philippines", Email = "emma-evans@yahoo.com.ph", Phone = "+63 995 371 8454", Status = "Active", FirstDonationDate = new DateOnly(2024, 1, 18), AcquisitionChannel = "Website", CreatedAt = new DateTime(2022, 1, 21) },
            new() { SupporterId = 6, SupporterType = "MonetaryDonor", DisplayName = "Olivia Ford", OrganizationName = null, FirstName = "Olivia", LastName = "Ford", RelationshipType = "International", Region = "Visayas", Country = "USA", Email = "olivia-ford@yahoo.com", Phone = "+1 (206) 358-4111", Status = "Active", FirstDonationDate = new DateOnly(2023, 3, 22), AcquisitionChannel = "WordOfMouth", CreatedAt = new DateTime(2022, 1, 26) },
            new() { SupporterId = 7, SupporterType = "MonetaryDonor", DisplayName = "Ethan Garcia", OrganizationName = null, FirstName = "Ethan", LastName = "Garcia", RelationshipType = "International", Region = "Mindanao", Country = "USA", Email = "ethan-garcia@aol.com", Phone = "+1 (212) 251-8811", Status = "Active", FirstDonationDate = new DateOnly(2023, 10, 19), AcquisitionChannel = "Event", CreatedAt = new DateTime(2022, 1, 31) },
            new() { SupporterId = 8, SupporterType = "InKindDonor", DisplayName = "Isla Hernandez", OrganizationName = null, FirstName = "Isla", LastName = "Hernandez", RelationshipType = "Local", Region = "Mindanao", Country = "Philippines", Email = "isla-hernandez@yahoo.com.ph", Phone = "+63 953 170 2113", Status = "Active", FirstDonationDate = new DateOnly(2023, 11, 6), AcquisitionChannel = "Church", CreatedAt = new DateTime(2022, 2, 5) },
            new() { SupporterId = 9, SupporterType = "Volunteer", DisplayName = "Sophia Ibrahim", OrganizationName = null, FirstName = "Sophia", LastName = "Ibrahim", RelationshipType = "Local", Region = "Luzon", Country = "Philippines", Email = "sophia-ibrahim@globe.com.ph", Phone = "+63 949 708 1651", Status = "Active", FirstDonationDate = new DateOnly(2024, 11, 4), AcquisitionChannel = "PartnerReferral", CreatedAt = new DateTime(2022, 2, 10) },
            new() { SupporterId = 10, SupporterType = "Volunteer", DisplayName = "Lucas Jones", OrganizationName = null, FirstName = "Lucas", LastName = "Jones", RelationshipType = "International", Region = "Luzon", Country = "Singapore", Email = "lucas-jones@gmail.com", Phone = "+65 8785 6147", Status = "Active", FirstDonationDate = new DateOnly(2024, 10, 18), AcquisitionChannel = "Event", CreatedAt = new DateTime(2022, 2, 15) },
            new() { SupporterId = 11, SupporterType = "MonetaryDonor", DisplayName = "Maya Kim", OrganizationName = null, FirstName = "Maya", LastName = "Kim", RelationshipType = "International", Region = "Luzon", Country = "USA", Email = "maya-kim@gmail.com", Phone = "+1 (469) 274-1152", Status = "Active", FirstDonationDate = new DateOnly(2024, 8, 20), AcquisitionChannel = "SocialMedia", CreatedAt = new DateTime(2022, 2, 20) },
            new() { SupporterId = 12, SupporterType = "InKindDonor", DisplayName = "Ella Lopez", OrganizationName = null, FirstName = "Ella", LastName = "Lopez", RelationshipType = "PartnerOrganization", Region = "Mindanao", Country = "Philippines", Email = "ella-lopez@globe.com.ph", Phone = "+63 929 371 3170", Status = "Active", FirstDonationDate = new DateOnly(2023, 2, 24), AcquisitionChannel = "Website", CreatedAt = new DateTime(2022, 2, 25) },
            new() { SupporterId = 13, SupporterType = "PartnerOrganization", DisplayName = "Hope Group", OrganizationName = "Hope Group", FirstName = null, LastName = null, RelationshipType = "Local", Region = "Luzon", Country = "Philippines", Email = "hope-group@hopegroup.ph", Phone = "+63 976 726 9666", Status = "Active", FirstDonationDate = new DateOnly(2023, 2, 10), AcquisitionChannel = "PartnerReferral", CreatedAt = new DateTime(2022, 3, 2) },
            new() { SupporterId = 14, SupporterType = "MonetaryDonor", DisplayName = "Owen Nguyen", OrganizationName = null, FirstName = "Owen", LastName = "Nguyen", RelationshipType = "Local", Region = "Mindanao", Country = "Philippines", Email = "owen-nguyen@globe.com.ph", Phone = "+63 966 218 2753", Status = "Active", FirstDonationDate = new DateOnly(2023, 12, 25), AcquisitionChannel = "WordOfMouth", CreatedAt = new DateTime(2022, 3, 7) },
            new() { SupporterId = 15, SupporterType = "SkillsContributor", DisplayName = "Zoe Ortiz", OrganizationName = null, FirstName = "Zoe", LastName = "Ortiz", RelationshipType = "Local", Region = "Luzon", Country = "Philippines", Email = "zoe-ortiz@pldt.net.ph", Phone = "+63 955 803 5325", Status = "Active", FirstDonationDate = new DateOnly(2024, 9, 15), AcquisitionChannel = "Website", CreatedAt = new DateTime(2022, 3, 12) },
            new() { SupporterId = 16, SupporterType = "InKindDonor", DisplayName = "Iris Patel", OrganizationName = null, FirstName = "Iris", LastName = "Patel", RelationshipType = "PartnerOrganization", Region = "Luzon", Country = "Philippines", Email = "iris-patel@smart.com.ph", Phone = "+63 967 145 1058", Status = "Active", FirstDonationDate = new DateOnly(2025, 7, 15), AcquisitionChannel = "Website", CreatedAt = new DateTime(2022, 3, 17) },
            new() { SupporterId = 17, SupporterType = "MonetaryDonor", DisplayName = "Hana Quinn", OrganizationName = null, FirstName = "Hana", LastName = "Quinn", RelationshipType = "PartnerOrganization", Region = "Luzon", Country = "Philippines", Email = "hana-quinn@smart.com.ph", Phone = "+63 947 822 8007", Status = "Active", FirstDonationDate = new DateOnly(2024, 12, 29), AcquisitionChannel = "Website", CreatedAt = new DateTime(2022, 3, 22) },
            new() { SupporterId = 18, SupporterType = "InKindDonor", DisplayName = "Theo Reed", OrganizationName = null, FirstName = "Theo", LastName = "Reed", RelationshipType = "PartnerOrganization", Region = "Luzon", Country = "Philippines", Email = "theo-reed@globe.com.ph", Phone = "+63 946 136 7049", Status = "Active", FirstDonationDate = new DateOnly(2024, 10, 9), AcquisitionChannel = "WordOfMouth", CreatedAt = new DateTime(2022, 3, 27) },
            new() { SupporterId = 19, SupporterType = "Volunteer", DisplayName = "Nora Singh", OrganizationName = null, FirstName = "Nora", LastName = "Singh", RelationshipType = "Local", Region = "Luzon", Country = "Philippines", Email = "nora-singh@yahoo.com.ph", Phone = "+63 979 315 5088", Status = "Active", FirstDonationDate = new DateOnly(2024, 12, 2), AcquisitionChannel = "SocialMedia", CreatedAt = new DateTime(2022, 4, 1) },
            new() { SupporterId = 20, SupporterType = "Volunteer", DisplayName = "Ezra Taylor", OrganizationName = null, FirstName = "Ezra", LastName = "Taylor", RelationshipType = "International", Region = "Luzon", Country = "Canada", Email = "ezra-taylor@gmail.com", Phone = "+1 (347) 358-4878", Status = "Active", FirstDonationDate = new DateOnly(2023, 3, 23), AcquisitionChannel = "PartnerReferral", CreatedAt = new DateTime(2022, 4, 6) },
            new() { SupporterId = 21, SupporterType = "SocialMediaAdvocate", DisplayName = "June Usman", OrganizationName = null, FirstName = "June", LastName = "Usman", RelationshipType = "PartnerOrganization", Region = "Mindanao", Country = "Philippines", Email = "june-usman@yahoo.com.ph", Phone = "+63 953 854 6442", Status = "Active", FirstDonationDate = new DateOnly(2023, 7, 25), AcquisitionChannel = "PartnerReferral", CreatedAt = new DateTime(2022, 4, 11) },
            new() { SupporterId = 22, SupporterType = "SkillsContributor", DisplayName = "Nico Vasquez", OrganizationName = null, FirstName = "Nico", LastName = "Vasquez", RelationshipType = "International", Region = "Luzon", Country = "USA", Email = "nico-vasquez@gmail.com", Phone = "+1 (415) 918-2771", Status = "Active", FirstDonationDate = new DateOnly(2025, 11, 13), AcquisitionChannel = "WordOfMouth", CreatedAt = new DateTime(2022, 4, 16) },
            new() { SupporterId = 23, SupporterType = "MonetaryDonor", DisplayName = "Ria White", OrganizationName = null, FirstName = "Ria", LastName = "White", RelationshipType = "Local", Region = "Luzon", Country = "Philippines", Email = "ria-white@smart.com.ph", Phone = "+63 979 412 4728", Status = "Active", FirstDonationDate = new DateOnly(2024, 11, 21), AcquisitionChannel = "Website", CreatedAt = new DateTime(2022, 4, 21) },
            new() { SupporterId = 24, SupporterType = "MonetaryDonor", DisplayName = "Sean Xu", OrganizationName = null, FirstName = "Sean", LastName = "Xu", RelationshipType = "Local", Region = "Visayas", Country = "Philippines", Email = "sean-xu@yahoo.com.ph", Phone = "+63 967 459 9346", Status = "Active", FirstDonationDate = new DateOnly(2023, 11, 8), AcquisitionChannel = "SocialMedia", CreatedAt = new DateTime(2022, 4, 26) },
            new() { SupporterId = 25, SupporterType = "MonetaryDonor", DisplayName = "Tina Young", OrganizationName = null, FirstName = "Tina", LastName = "Young", RelationshipType = "Local", Region = "Mindanao", Country = "Philippines", Email = "tina-young@yahoo.com.ph", Phone = "+63 966 282 5349", Status = "Active", FirstDonationDate = new DateOnly(2025, 12, 2), AcquisitionChannel = "Church", CreatedAt = new DateTime(2022, 5, 1) },
            new() { SupporterId = 26, SupporterType = "MonetaryDonor", DisplayName = "Margo Zhang", OrganizationName = null, FirstName = "Margo", LastName = "Zhang", RelationshipType = "Local", Region = "Visayas", Country = "Philippines", Email = "margo-zhang@smart.com.ph", Phone = "+63 951 623 2894", Status = "Active", FirstDonationDate = new DateOnly(2024, 11, 20), AcquisitionChannel = "WordOfMouth", CreatedAt = new DateTime(2022, 5, 6) },
            new() { SupporterId = 27, SupporterType = "MonetaryDonor", DisplayName = "Jules Abe", OrganizationName = null, FirstName = "Jules", LastName = "Abe", RelationshipType = "Local", Region = "Visayas", Country = "Philippines", Email = "jules-abe@yahoo.com.ph", Phone = "+63 939 925 9821", Status = "Active", FirstDonationDate = new DateOnly(2024, 8, 3), AcquisitionChannel = "WordOfMouth", CreatedAt = new DateTime(2022, 5, 11) },
            new() { SupporterId = 28, SupporterType = "Volunteer", DisplayName = "Pia Baker", OrganizationName = null, FirstName = "Pia", LastName = "Baker", RelationshipType = "International", Region = "Mindanao", Country = "USA", Email = "pia-baker@gmail.com", Phone = "+1 (718) 538-6143", Status = "Active", FirstDonationDate = null, AcquisitionChannel = "Website", CreatedAt = new DateTime(2022, 5, 16) },
            new() { SupporterId = 29, SupporterType = "Volunteer", DisplayName = "Seth Clark", OrganizationName = null, FirstName = "Seth", LastName = "Clark", RelationshipType = "PartnerOrganization", Region = "Luzon", Country = "Philippines", Email = "seth-clark@smart.com.ph", Phone = "+63 977 512 5844", Status = "Active", FirstDonationDate = new DateOnly(2025, 9, 28), AcquisitionChannel = "Event", CreatedAt = new DateTime(2022, 5, 21) },
            new() { SupporterId = 30, SupporterType = "InKindDonor", DisplayName = "Rina Davis", OrganizationName = null, FirstName = "Rina", LastName = "Davis", RelationshipType = "International", Region = "Luzon", Country = "USA", Email = "rina-davis@gmail.com", Phone = "+1 (415) 830-5930", Status = "Active", FirstDonationDate = new DateOnly(2025, 7, 29), AcquisitionChannel = "SocialMedia", CreatedAt = new DateTime(2022, 5, 26) },
        };
        db.Supporters.AddRange(supporters);
        await db.SaveChangesAsync();

        // 5. Social Media Posts (20 rows)
        var socialMediaPosts = new List<SocialMediaPost>
        {
            new() { PostId = 318, Platform = "WhatsApp", PlatformPostId = "wa_4293211912553134", PostUrl = "https://whatsapp.com/channel/lighthouse_ph/4293211912553134", CreatedAt = new DateTime(2023, 1, 5, 18, 52, 0), DayOfWeek = "Thursday", PostHour = 18, PostType = "FundraisingAppeal", MediaType = "Text", Caption = "This is hard to ask, but our reserve is gone. We're raising P30,000 to make sure our girls don't go without. https://lighthouse.ph/donate?utm_source=whatsapp", Hashtags = null, NumHashtags = 0, MentionsCount = 3, HasCallToAction = true, CallToActionType = "LearnMore", ContentTopic = "Education", SentimentTone = "Grateful", CaptionLength = 157, FeaturesResidentStory = false, CampaignName = null, IsBoosted = false, BoostBudgetPhp = null, Impressions = 1580, Reach = 1093, Likes = 118, Comments = 36, Shares = 22, Saves = 9, ClickThroughs = 48, VideoViews = null, EngagementRate = 0.1105m, ProfileVisits = 21, DonationReferrals = 10, EstimatedDonationValuePhp = 21473.25m, FollowerCountAtPost = 1522, WatchTimeSeconds = null, AvgViewDurationSeconds = null, SubscriberCountAtPost = null, Forwards = 50 },
            new() { PostId = 529, Platform = "Instagram", PlatformPostId = "ig_5129900136072862", PostUrl = "https://instagram.com/p/sYhZp-0AvhH", CreatedAt = new DateTime(2023, 1, 6, 11, 30, 0), DayOfWeek = "Friday", PostHour = 11, PostType = "EducationalContent", MediaType = "Photo", Caption = "What does freedom mean to a trafficking survivor? We asked Lucia, and her answer will stay with you. https://lighthouse.ph/donate?utm_source=instagram", Hashtags = "#SurvivorStrong, #BeTheChange, #HumanTrafficking, #ChildRights", NumHashtags = 4, MentionsCount = 0, HasCallToAction = false, CallToActionType = null, ContentTopic = "Education", SentimentTone = "Celebratory", CaptionLength = 150, FeaturesResidentStory = false, CampaignName = null, IsBoosted = false, BoostBudgetPhp = null, Impressions = 6362, Reach = 4395, Likes = 548, Comments = 110, Shares = 149, Saves = 59, ClickThroughs = 85, VideoViews = null, EngagementRate = 0.1745m, ProfileVisits = 335, DonationReferrals = 2, EstimatedDonationValuePhp = 4708.45m, FollowerCountAtPost = 1833, WatchTimeSeconds = null, AvgViewDurationSeconds = null, SubscriberCountAtPost = null, Forwards = null },
            new() { PostId = 86, Platform = "LinkedIn", PlatformPostId = "li_2326736034499294", PostUrl = "https://linkedin.com/feed/update/urn:li:activity:8868898240939584237", CreatedAt = new DateTime(2023, 1, 8, 10, 14, 0), DayOfWeek = "Sunday", PostHour = 10, PostType = "EventPromotion", MediaType = "Text", Caption = "SAVE THE DATE! Join us on January 21 for Fundraiser Gala. All proceeds support our girls. https://lighthouse.ph/donate?utm_source=linkedin", Hashtags = null, NumHashtags = 0, MentionsCount = 0, HasCallToAction = false, CallToActionType = null, ContentTopic = "Reintegration", SentimentTone = "Urgent", CaptionLength = 138, FeaturesResidentStory = false, CampaignName = null, IsBoosted = false, BoostBudgetPhp = null, Impressions = 554, Reach = 336, Likes = 27, Comments = 7, Shares = 12, Saves = 4, ClickThroughs = 3, VideoViews = null, EngagementRate = 0.1411m, ProfileVisits = 8, DonationReferrals = 0, EstimatedDonationValuePhp = 0.0m, FollowerCountAtPost = 457, WatchTimeSeconds = null, AvgViewDurationSeconds = null, SubscriberCountAtPost = null, Forwards = null },
            new() { PostId = 380, Platform = "Instagram", PlatformPostId = "ig_4154485528046983", PostUrl = "https://instagram.com/p/1LSXA225Jpv", CreatedAt = new DateTime(2023, 1, 9, 15, 6, 0), DayOfWeek = "Monday", PostHour = 15, PostType = "ThankYou", MediaType = "Video", Caption = "Every donation is a prayer answered. Thank you for being the answer for our girls. #ProtectChildren, #BeTheChange", Hashtags = "#ProtectChildren, #BeTheChange", NumHashtags = 2, MentionsCount = 1, HasCallToAction = false, CallToActionType = null, ContentTopic = "Education", SentimentTone = "Emotional", CaptionLength = 113, FeaturesResidentStory = false, CampaignName = null, IsBoosted = false, BoostBudgetPhp = null, Impressions = 4309, Reach = 2948, Likes = 190, Comments = 55, Shares = 45, Saves = 16, ClickThroughs = 35, VideoViews = 3313, EngagementRate = 0.0677m, ProfileVisits = 62, DonationReferrals = 0, EstimatedDonationValuePhp = 0.0m, FollowerCountAtPost = 1796, WatchTimeSeconds = null, AvgViewDurationSeconds = null, SubscriberCountAtPost = null, Forwards = null },
            new() { PostId = 425, Platform = "TikTok", PlatformPostId = "tk_7166643297225195", PostUrl = "https://tiktok.com/@lighthouse_ph/video/8171530469141229839", CreatedAt = new DateTime(2023, 1, 9, 15, 59, 0), DayOfWeek = "Monday", PostHour = 15, PostType = "ThankYou", MediaType = "Reel", Caption = "Big thanks to Juan for the recent donation. You're making magic happen. #SurvivorStrong, #EndViolence, #HumanTrafficking, #ForYou", Hashtags = "#SurvivorStrong, #EndViolence, #HumanTrafficking, #ForYou", NumHashtags = 4, MentionsCount = 1, HasCallToAction = true, CallToActionType = "LearnMore", ContentTopic = "Education", SentimentTone = "Hopeful", CaptionLength = 129, FeaturesResidentStory = false, CampaignName = null, IsBoosted = true, BoostBudgetPhp = 4030.64m, Impressions = 23175, Reach = 14008, Likes = 728, Comments = 232, Shares = 141, Saves = 79, ClickThroughs = 474, VideoViews = 17974, EngagementRate = 0.0802m, ProfileVisits = 172, DonationReferrals = 2, EstimatedDonationValuePhp = 8351.49m, FollowerCountAtPost = 916, WatchTimeSeconds = null, AvgViewDurationSeconds = null, SubscriberCountAtPost = null, Forwards = null },
            new() { PostId = 807, Platform = "Instagram", PlatformPostId = "ig_8963135424055158", PostUrl = "https://instagram.com/p/EpLXrJG8HzQ", CreatedAt = new DateTime(2023, 1, 12, 13, 41, 0), DayOfWeek = "Thursday", PostHour = 13, PostType = "EventPromotion", MediaType = "Carousel", Caption = "You're invited! Volunteer Day is happening January 26. We'd love to see you there. https://lighthouse.ph/donate?utm_source=instagram", Hashtags = "#SpreadTheWord, #ChildAbuse, #ChildRights", NumHashtags = 3, MentionsCount = 0, HasCallToAction = false, CallToActionType = null, ContentTopic = "CampaignLaunch", SentimentTone = "Emotional", CaptionLength = 132, FeaturesResidentStory = false, CampaignName = null, IsBoosted = false, BoostBudgetPhp = null, Impressions = 5998, Reach = 4215, Likes = 555, Comments = 180, Shares = 109, Saves = 90, ClickThroughs = 60, VideoViews = null, EngagementRate = 0.1504m, ProfileVisits = 270, DonationReferrals = 1, EstimatedDonationValuePhp = 3516.65m, FollowerCountAtPost = 1833, WatchTimeSeconds = null, AvgViewDurationSeconds = null, SubscriberCountAtPost = null, Forwards = null },
            new() { PostId = 757, Platform = "Facebook", PlatformPostId = "fb_1326638815902524", PostUrl = "https://facebook.com/lighthouse.ph/posts/1326638815902524", CreatedAt = new DateTime(2023, 1, 17, 13, 25, 0), DayOfWeek = "Tuesday", PostHour = 13, PostType = "FundraisingAppeal", MediaType = "Video", Caption = "URGENT: Our food budget is running low. 9 hungry girls are counting on us. Can you help? https://lighthouse.ph/donate?utm_source=facebook", Hashtags = "#SafeHaven", NumHashtags = 1, MentionsCount = 0, HasCallToAction = true, CallToActionType = "DonateNow", ContentTopic = "Health", SentimentTone = "Celebratory", CaptionLength = 137, FeaturesResidentStory = false, CampaignName = null, IsBoosted = false, BoostBudgetPhp = null, Impressions = 3513, Reach = 2099, Likes = 176, Comments = 82, Shares = 38, Saves = 19, ClickThroughs = 107, VideoViews = 2877, EngagementRate = 0.127m, ProfileVisits = 51, DonationReferrals = 6, EstimatedDonationValuePhp = 27029.1m, FollowerCountAtPost = 2489, WatchTimeSeconds = null, AvgViewDurationSeconds = null, SubscriberCountAtPost = null, Forwards = null },
            new() { PostId = 554, Platform = "Twitter", PlatformPostId = "tw_6417365342012870", PostUrl = "https://twitter.com/lighthouse_ph/status/3626013712550021531", CreatedAt = new DateTime(2023, 1, 17, 18, 22, 0), DayOfWeek = "Tuesday", PostHour = 18, PostType = "FundraisingAppeal", MediaType = "Photo", Caption = "URGENT: Our food budget is running low. 15 hungry girls are counting on us. Can you help? https://lighthouse.ph/donate?utm_source=twitter", Hashtags = "#GiveHope, #ChildAbuse, #EndViolence", NumHashtags = 3, MentionsCount = 0, HasCallToAction = true, CallToActionType = "DonateNow", ContentTopic = "CampaignLaunch", SentimentTone = "Urgent", CaptionLength = 137, FeaturesResidentStory = false, CampaignName = null, IsBoosted = false, BoostBudgetPhp = null, Impressions = 3192, Reach = 1854, Likes = 325, Comments = 118, Shares = 82, Saves = 32, ClickThroughs = 92, VideoViews = null, EngagementRate = 0.1851m, ProfileVisits = 120, DonationReferrals = 14, EstimatedDonationValuePhp = 55256.28m, FollowerCountAtPost = 1228, WatchTimeSeconds = null, AvgViewDurationSeconds = null, SubscriberCountAtPost = null, Forwards = null },
            new() { PostId = 736, Platform = "YouTube", PlatformPostId = "yt_2556432223328375", PostUrl = "https://youtube.com/watch?v=iOTGiq7fPy7", CreatedAt = new DateTime(2023, 1, 19, 16, 38, 0), DayOfWeek = "Thursday", PostHour = 16, PostType = "EventPromotion", MediaType = "Video", Caption = "Something big is coming January 27. We can't wait to celebrate with you at Benefit Concert. https://lighthouse.ph/donate?utm_source=youtube", Hashtags = "#BreakTheCycle, #OSAEC, #ChildAbuse, #ForYou", NumHashtags = 4, MentionsCount = 0, HasCallToAction = true, CallToActionType = "SignUp", ContentTopic = "Education", SentimentTone = "Urgent", CaptionLength = 139, FeaturesResidentStory = false, CampaignName = null, IsBoosted = false, BoostBudgetPhp = null, Impressions = 11815, Reach = 8501, Likes = 1075, Comments = 585, Shares = 298, Saves = 158, ClickThroughs = 422, VideoViews = 13218, EngagementRate = 0.2064m, ProfileVisits = 723, DonationReferrals = 2, EstimatedDonationValuePhp = 6056.45m, FollowerCountAtPost = 620, WatchTimeSeconds = 436194, AvgViewDurationSeconds = 33, SubscriberCountAtPost = 204, Forwards = null },
            new() { PostId = 148, Platform = "YouTube", PlatformPostId = "yt_8302455599760686", PostUrl = "https://youtube.com/watch?v=tqfyyrhtpVI", CreatedAt = new DateTime(2023, 1, 19, 18, 36, 0), DayOfWeek = "Thursday", PostHour = 18, PostType = "EducationalContent", MediaType = "Video", Caption = "Myth: Only girls are trafficked. TRUTH: Boys and men are also victims, though girls are disproportionately affected. This is why survivors need trauma-informed care. ", Hashtags = null, NumHashtags = 0, MentionsCount = 0, HasCallToAction = false, CallToActionType = null, ContentTopic = "Gratitude", SentimentTone = "Informative", CaptionLength = 166, FeaturesResidentStory = false, CampaignName = null, IsBoosted = false, BoostBudgetPhp = null, Impressions = 11440, Reach = 6360, Likes = 388, Comments = 137, Shares = 92, Saves = 53, ClickThroughs = 114, VideoViews = 5162, EngagementRate = 0.0863m, ProfileVisits = 125, DonationReferrals = 1, EstimatedDonationValuePhp = 4623.84m, FollowerCountAtPost = 572, WatchTimeSeconds = 320044, AvgViewDurationSeconds = 62, SubscriberCountAtPost = 204, Forwards = null },
            new() { PostId = 537, Platform = "WhatsApp", PlatformPostId = "wa_7268725548108024", PostUrl = "https://whatsapp.com/channel/lighthouse_ph/7268725548108024", CreatedAt = new DateTime(2023, 1, 19, 19, 29, 0), DayOfWeek = "Thursday", PostHour = 19, PostType = "Campaign", MediaType = "Text", Caption = "Join our Summer of Safety campaign! Every peso brings a girl closer to safety and dignity. https://lighthouse.ph/donate?utm_source=whatsapp", Hashtags = null, NumHashtags = 0, MentionsCount = 0, HasCallToAction = true, CallToActionType = "DonateNow", ContentTopic = "SafehouseLife", SentimentTone = "Grateful", CaptionLength = 139, FeaturesResidentStory = false, CampaignName = null, IsBoosted = false, BoostBudgetPhp = null, Impressions = 2003, Reach = 1311, Likes = 119, Comments = 23, Shares = 28, Saves = 12, ClickThroughs = 65, VideoViews = null, EngagementRate = 0.1183m, ProfileVisits = 39, DonationReferrals = 7, EstimatedDonationValuePhp = 40736.87m, FollowerCountAtPost = 1543, WatchTimeSeconds = null, AvgViewDurationSeconds = null, SubscriberCountAtPost = null, Forwards = 63 },
            new() { PostId = 507, Platform = "Twitter", PlatformPostId = "tw_7384414736684020", PostUrl = "https://twitter.com/lighthouse_ph/status/4852754364565311181", CreatedAt = new DateTime(2023, 1, 20, 9, 37, 0), DayOfWeek = "Friday", PostHour = 9, PostType = "ImpactStory", MediaType = "Reel", Caption = "After 8 months in our program, one of our girls graduated from the Bridge Program with top marks. From a child who couldn't read to a confident student - this is what your support makes possible. Be the change", Hashtags = null, NumHashtags = 0, MentionsCount = 1, HasCallToAction = false, CallToActionType = null, ContentTopic = "AwarenessRaising", SentimentTone = "Grateful", CaptionLength = 209, FeaturesResidentStory = true, CampaignName = null, IsBoosted = false, BoostBudgetPhp = null, Impressions = 4306, Reach = 2622, Likes = 123, Comments = 36, Shares = 84, Saves = 16, ClickThroughs = 33, VideoViews = 3231, EngagementRate = 0.0825m, ProfileVisits = 57, DonationReferrals = 12, EstimatedDonationValuePhp = 39786.25m, FollowerCountAtPost = 1228, WatchTimeSeconds = null, AvgViewDurationSeconds = null, SubscriberCountAtPost = null, Forwards = null },
            new() { PostId = 226, Platform = "Instagram", PlatformPostId = "ig_7406321585959441", PostUrl = "https://instagram.com/p/ldWLY9E9-RT", CreatedAt = new DateTime(2023, 1, 24, 13, 34, 0), DayOfWeek = "Tuesday", PostHour = 13, PostType = "Campaign", MediaType = "Photo", Caption = "This January, we're asking for help. P132,000 will cover meals, medicine, and hope for 19 girls. https://lighthouse.ph/donate?utm_source=instagram", Hashtags = "#ProtectChildren, #GiveHope, #EndViolence, #ChildRights", NumHashtags = 4, MentionsCount = 0, HasCallToAction = true, CallToActionType = "SignUp", ContentTopic = "AwarenessRaising", SentimentTone = "Grateful", CaptionLength = 146, FeaturesResidentStory = false, CampaignName = null, IsBoosted = true, BoostBudgetPhp = 4211.14m, Impressions = 28562, Reach = 20000, Likes = 1513, Comments = 808, Shares = 357, Saves = 231, ClickThroughs = 1018, VideoViews = null, EngagementRate = 0.1359m, ProfileVisits = 1099, DonationReferrals = 32, EstimatedDonationValuePhp = 27427.85m, FollowerCountAtPost = 1782, WatchTimeSeconds = null, AvgViewDurationSeconds = null, SubscriberCountAtPost = null, Forwards = null },
            new() { PostId = 657, Platform = "WhatsApp", PlatformPostId = "wa_3923711158232061", PostUrl = "https://whatsapp.com/channel/lighthouse_ph/3923711158232061", CreatedAt = new DateTime(2023, 1, 25, 4, 31, 0), DayOfWeek = "Wednesday", PostHour = 4, PostType = "FundraisingAppeal", MediaType = "Video", Caption = "This is hard to ask, but our reserve is gone. We're raising P47,000 to make sure our girls don't go without. https://lighthouse.ph/donate?utm_source=whatsapp", Hashtags = null, NumHashtags = 0, MentionsCount = 0, HasCallToAction = true, CallToActionType = "SignUp", ContentTopic = "Education", SentimentTone = "Emotional", CaptionLength = 157, FeaturesResidentStory = false, CampaignName = null, IsBoosted = false, BoostBudgetPhp = null, Impressions = 618, Reach = 371, Likes = 15, Comments = 5, Shares = 2, Saves = 1, ClickThroughs = 19, VideoViews = 529, EngagementRate = 0.043m, ProfileVisits = 3, DonationReferrals = 0, EstimatedDonationValuePhp = 0.0m, FollowerCountAtPost = 1543, WatchTimeSeconds = null, AvgViewDurationSeconds = null, SubscriberCountAtPost = null, Forwards = 5 },
            new() { PostId = 714, Platform = "Twitter", PlatformPostId = "tw_3972216254597381", PostUrl = "https://twitter.com/lighthouse_ph/status/3560304620985599589", CreatedAt = new DateTime(2023, 1, 27, 22, 40, 0), DayOfWeek = "Friday", PostHour = 22, PostType = "Campaign", MediaType = "Video", Caption = "We set our goal at P172,000 for Summer of Safety. We know it's ambitious, but our girls are worth it. Help us? https://lighthouse.ph/donate?utm_source=twitter", Hashtags = "#SafeHaven, #GiveHope", NumHashtags = 2, MentionsCount = 0, HasCallToAction = true, CallToActionType = "SignUp", ContentTopic = "Education", SentimentTone = "Celebratory", CaptionLength = 158, FeaturesResidentStory = false, CampaignName = null, IsBoosted = false, BoostBudgetPhp = null, Impressions = 2763, Reach = 2079, Likes = 266, Comments = 63, Shares = 22, Saves = 19, ClickThroughs = 95, VideoViews = 2604, EngagementRate = 0.1018m, ProfileVisits = 79, DonationReferrals = 2, EstimatedDonationValuePhp = 3650.81m, FollowerCountAtPost = 1228, WatchTimeSeconds = null, AvgViewDurationSeconds = null, SubscriberCountAtPost = null, Forwards = null },
            new() { PostId = 157, Platform = "Instagram", PlatformPostId = "ig_2747696149547904", PostUrl = "https://instagram.com/p/zPzA2ZHWuex", CreatedAt = new DateTime(2023, 1, 28, 2, 19, 0), DayOfWeek = "Saturday", PostHour = 2, PostType = "EducationalContent", MediaType = "Carousel", Caption = "Learn: The biggest barrier to safety for girls in trafficking is lack of economic opportunity. What we're doing about it: https://lighthouse.ph/donate?utm_source=instagram", Hashtags = "#GiveHope", NumHashtags = 1, MentionsCount = 0, HasCallToAction = false, CallToActionType = null, ContentTopic = "DonorImpact", SentimentTone = "Informative", CaptionLength = 171, FeaturesResidentStory = false, CampaignName = null, IsBoosted = false, BoostBudgetPhp = null, Impressions = 1089, Reach = 770, Likes = 8, Comments = 2, Shares = 1, Saves = 1, ClickThroughs = 8, VideoViews = null, EngagementRate = 0.0173m, ProfileVisits = 3, DonationReferrals = 0, EstimatedDonationValuePhp = 0.0m, FollowerCountAtPost = 1782, WatchTimeSeconds = null, AvgViewDurationSeconds = null, SubscriberCountAtPost = null, Forwards = null },
            new() { PostId = 733, Platform = "Twitter", PlatformPostId = "tw_6811761595369896", PostUrl = "https://twitter.com/lighthouse_ph/status/4481000881554928409", CreatedAt = new DateTime(2023, 1, 31, 1, 44, 0), DayOfWeek = "Tuesday", PostHour = 1, PostType = "ImpactStory", MediaType = "Video", Caption = "After 8 months in our program, one of our girls graduated from the Bridge Program with top marks. From a child who couldn't read to a confident student - this is what your support makes possible. Be the change", Hashtags = "#ProtectChildren, #GiveHope", NumHashtags = 2, MentionsCount = 1, HasCallToAction = false, CallToActionType = null, ContentTopic = "Gratitude", SentimentTone = "Grateful", CaptionLength = 209, FeaturesResidentStory = true, CampaignName = null, IsBoosted = false, BoostBudgetPhp = null, Impressions = 2460, Reach = 1590, Likes = 32, Comments = 7, Shares = 16, Saves = 2, ClickThroughs = 22, VideoViews = 3098, EngagementRate = 0.0224m, ProfileVisits = 8, DonationReferrals = 1, EstimatedDonationValuePhp = 4431.22m, FollowerCountAtPost = 1228, WatchTimeSeconds = null, AvgViewDurationSeconds = null, SubscriberCountAtPost = null, Forwards = null },
            new() { PostId = 324, Platform = "Instagram", PlatformPostId = "ig_6318381633221854", PostUrl = "https://instagram.com/p/Ft3sRqWyYvG", CreatedAt = new DateTime(2023, 1, 31, 18, 27, 0), DayOfWeek = "Tuesday", PostHour = 18, PostType = "Campaign", MediaType = "Reel", Caption = "We set our goal at P68,000 for GivingTuesday. We know it's ambitious, but our girls are worth it. Help us? https://lighthouse.ph/donate?utm_source=instagram", Hashtags = "#DonateNow", NumHashtags = 1, MentionsCount = 0, HasCallToAction = true, CallToActionType = "ShareStory", ContentTopic = "Education", SentimentTone = "Hopeful", CaptionLength = 156, FeaturesResidentStory = false, CampaignName = null, IsBoosted = false, BoostBudgetPhp = null, Impressions = 2588, Reach = 1446, Likes = 137, Comments = 15, Shares = 19, Saves = 12, ClickThroughs = 57, VideoViews = 1507, EngagementRate = 0.1004m, ProfileVisits = 24, DonationReferrals = 1, EstimatedDonationValuePhp = 2107.99m, FollowerCountAtPost = 1782, WatchTimeSeconds = null, AvgViewDurationSeconds = null, SubscriberCountAtPost = null, Forwards = null },
            new() { PostId = 808, Platform = "Twitter", PlatformPostId = "tw_1260274980842817", PostUrl = "https://twitter.com/lighthouse_ph/status/7153177332188397284", CreatedAt = new DateTime(2023, 2, 1, 6, 33, 0), DayOfWeek = "Wednesday", PostHour = 6, PostType = "FundraisingAppeal", MediaType = "Carousel", Caption = "URGENT: Our food budget is running low. 5 hungry girls are counting on us. Can you help? https://lighthouse.ph/donate?utm_source=twitter", Hashtags = "#SurvivorStrong, #GiveHope", NumHashtags = 2, MentionsCount = 1, HasCallToAction = true, CallToActionType = "DonateNow", ContentTopic = "Health", SentimentTone = "Hopeful", CaptionLength = 136, FeaturesResidentStory = false, CampaignName = null, IsBoosted = false, BoostBudgetPhp = null, Impressions = 3448, Reach = 1971, Likes = 111, Comments = 28, Shares = 19, Saves = 15, ClickThroughs = 84, VideoViews = null, EngagementRate = 0.0642m, ProfileVisits = 28, DonationReferrals = 2, EstimatedDonationValuePhp = 2677.48m, FollowerCountAtPost = 1228, WatchTimeSeconds = null, AvgViewDurationSeconds = null, SubscriberCountAtPost = null, Forwards = null },
            new() { PostId = 292, Platform = "YouTube", PlatformPostId = "yt_3480558436383010", PostUrl = "https://youtube.com/watch?v=un9naFDUHNh", CreatedAt = new DateTime(2023, 2, 14, 16, 41, 0), DayOfWeek = "Tuesday", PostHour = 16, PostType = "ImpactStory", MediaType = "Video", Caption = "We don't just provide shelter. We provide HOPE. Meet Lucia, whose life changed because someone believed in her. Be the change", Hashtags = "#ChildProtection, #BeTheChange, #Trending", NumHashtags = 3, MentionsCount = 0, HasCallToAction = false, CallToActionType = null, ContentTopic = "Reintegration", SentimentTone = "Celebratory", CaptionLength = 125, FeaturesResidentStory = true, CampaignName = null, IsBoosted = false, BoostBudgetPhp = null, Impressions = 28714, Reach = 20000, Likes = 2202, Comments = 613, Shares = 1206, Saves = 209, ClickThroughs = 387, VideoViews = 17492, EngagementRate = 0.1451m, ProfileVisits = 947, DonationReferrals = 197, EstimatedDonationValuePhp = 801434.24m, FollowerCountAtPost = 620, WatchTimeSeconds = 297364, AvgViewDurationSeconds = 17, SubscriberCountAtPost = 211, Forwards = null },
        };
        db.SocialMediaPosts.AddRange(socialMediaPosts);
        await db.SaveChangesAsync();

        // 6. Donations (30 rows)
        var donations = new List<Donation>
        {
            new() { DonationId = 1, SupporterId = 42, DonationType = "Monetary", DonationDate = new DateOnly(2025, 12, 31), IsRecurring = false, CampaignName = null, ChannelSource = "Campaign", CurrencyCode = "PHP", Amount = 717.18m, EstimatedValue = 717.18m, ImpactUnit = "pesos", Notes = "In support of safehouse operations", ReferralPostId = null },
            new() { DonationId = 2, SupporterId = 25, DonationType = "Time", DonationDate = new DateOnly(2025, 12, 2), IsRecurring = true, CampaignName = "Year-End Hope", ChannelSource = "Event", CurrencyCode = null, Amount = null, EstimatedValue = 35.15m, ImpactUnit = "hours", Notes = "Community outreach support", ReferralPostId = null },
            new() { DonationId = 3, SupporterId = 19, DonationType = "Monetary", DonationDate = new DateOnly(2024, 12, 2), IsRecurring = false, CampaignName = null, ChannelSource = "PartnerReferral", CurrencyCode = "PHP", Amount = 1074.65m, EstimatedValue = 1074.65m, ImpactUnit = "pesos", Notes = "Campaign support", ReferralPostId = null },
            new() { DonationId = 4, SupporterId = 33, DonationType = "Monetary", DonationDate = new DateOnly(2023, 9, 11), IsRecurring = false, CampaignName = null, ChannelSource = "PartnerReferral", CurrencyCode = "PHP", Amount = 1230.56m, EstimatedValue = 1230.56m, ImpactUnit = "pesos", Notes = "In support of safehouse operations", ReferralPostId = null },
            new() { DonationId = 5, SupporterId = 24, DonationType = "InKind", DonationDate = new DateOnly(2023, 11, 8), IsRecurring = true, CampaignName = "GivingTuesday", ChannelSource = "SocialMedia", CurrencyCode = null, Amount = null, EstimatedValue = 1177.41m, ImpactUnit = "items", Notes = "In support of safehouse operations", ReferralPostId = null },
            new() { DonationId = 6, SupporterId = 25, DonationType = "Monetary", DonationDate = new DateOnly(2025, 9, 18), IsRecurring = true, CampaignName = null, ChannelSource = "Direct", CurrencyCode = "PHP", Amount = 678.86m, EstimatedValue = 678.86m, ImpactUnit = "pesos", Notes = "Campaign support", ReferralPostId = null },
            new() { DonationId = 7, SupporterId = 25, DonationType = "Time", DonationDate = new DateOnly(2024, 12, 14), IsRecurring = true, CampaignName = "Year-End Hope", ChannelSource = "Event", CurrencyCode = null, Amount = null, EstimatedValue = 37.53m, ImpactUnit = "hours", Notes = "Campaign support", ReferralPostId = null },
            new() { DonationId = 8, SupporterId = 23, DonationType = "Monetary", DonationDate = new DateOnly(2024, 11, 21), IsRecurring = false, CampaignName = "GivingTuesday", ChannelSource = "Direct", CurrencyCode = "PHP", Amount = 600.64m, EstimatedValue = 600.64m, ImpactUnit = "pesos", Notes = "Campaign support", ReferralPostId = null },
            new() { DonationId = 9, SupporterId = 54, DonationType = "InKind", DonationDate = new DateOnly(2023, 9, 25), IsRecurring = true, CampaignName = null, ChannelSource = "Campaign", CurrencyCode = null, Amount = null, EstimatedValue = 911.84m, ImpactUnit = "items", Notes = "Monthly contribution", ReferralPostId = null },
            new() { DonationId = 10, SupporterId = 36, DonationType = "Monetary", DonationDate = new DateOnly(2023, 4, 16), IsRecurring = false, CampaignName = "Summer of Safety", ChannelSource = "Event", CurrencyCode = "PHP", Amount = 1677.73m, EstimatedValue = 1677.73m, ImpactUnit = "pesos", Notes = "In support of safehouse operations", ReferralPostId = null },
            new() { DonationId = 11, SupporterId = 13, DonationType = "Time", DonationDate = new DateOnly(2023, 2, 10), IsRecurring = false, CampaignName = null, ChannelSource = "Event", CurrencyCode = null, Amount = null, EstimatedValue = 11.39m, ImpactUnit = "hours", Notes = "In support of safehouse operations", ReferralPostId = null },
            new() { DonationId = 12, SupporterId = 26, DonationType = "Monetary", DonationDate = new DateOnly(2024, 11, 20), IsRecurring = true, CampaignName = "GivingTuesday", ChannelSource = "Direct", CurrencyCode = "PHP", Amount = 1773.19m, EstimatedValue = 1773.19m, ImpactUnit = "pesos", Notes = "Event donation", ReferralPostId = null },
            new() { DonationId = 13, SupporterId = 25, DonationType = "InKind", DonationDate = new DateOnly(2025, 8, 30), IsRecurring = true, CampaignName = null, ChannelSource = "Direct", CurrencyCode = null, Amount = null, EstimatedValue = 433.32m, ImpactUnit = "items", Notes = "Campaign support", ReferralPostId = null },
            new() { DonationId = 14, SupporterId = 47, DonationType = "Monetary", DonationDate = new DateOnly(2025, 10, 7), IsRecurring = false, CampaignName = null, ChannelSource = "PartnerReferral", CurrencyCode = "PHP", Amount = 1541.75m, EstimatedValue = 1541.75m, ImpactUnit = "pesos", Notes = "In support of safehouse operations", ReferralPostId = null },
            new() { DonationId = 15, SupporterId = 1, DonationType = "InKind", DonationDate = new DateOnly(2023, 7, 2), IsRecurring = true, CampaignName = null, ChannelSource = "Event", CurrencyCode = null, Amount = null, EstimatedValue = 300.0m, ImpactUnit = "items", Notes = "Campaign support", ReferralPostId = null },
            new() { DonationId = 16, SupporterId = 45, DonationType = "Monetary", DonationDate = new DateOnly(2024, 10, 25), IsRecurring = true, CampaignName = null, ChannelSource = "Campaign", CurrencyCode = "PHP", Amount = 4026.84m, EstimatedValue = 4026.84m, ImpactUnit = "pesos", Notes = "Monthly contribution", ReferralPostId = null },
            new() { DonationId = 17, SupporterId = 26, DonationType = "SocialMedia", DonationDate = new DateOnly(2023, 8, 11), IsRecurring = true, CampaignName = null, ChannelSource = "Event", CurrencyCode = null, Amount = null, EstimatedValue = 4.3m, ImpactUnit = "campaigns", Notes = "Community outreach support", ReferralPostId = null },
            new() { DonationId = 18, SupporterId = 51, DonationType = "Time", DonationDate = new DateOnly(2026, 1, 6), IsRecurring = false, CampaignName = null, ChannelSource = "Direct", CurrencyCode = null, Amount = null, EstimatedValue = 17.79m, ImpactUnit = "hours", Notes = "Monthly contribution", ReferralPostId = null },
            new() { DonationId = 19, SupporterId = 4, DonationType = "Monetary", DonationDate = new DateOnly(2026, 3, 1), IsRecurring = true, CampaignName = null, ChannelSource = "Event", CurrencyCode = "PHP", Amount = 342.96m, EstimatedValue = 342.96m, ImpactUnit = "pesos", Notes = "Community outreach support", ReferralPostId = null },
            new() { DonationId = 20, SupporterId = 45, DonationType = "Monetary", DonationDate = new DateOnly(2023, 8, 31), IsRecurring = true, CampaignName = null, ChannelSource = "Campaign", CurrencyCode = "PHP", Amount = 962.42m, EstimatedValue = 962.42m, ImpactUnit = "pesos", Notes = "Event donation", ReferralPostId = null },
            new() { DonationId = 21, SupporterId = 41, DonationType = "Monetary", DonationDate = new DateOnly(2024, 1, 13), IsRecurring = false, CampaignName = null, ChannelSource = "Event", CurrencyCode = "PHP", Amount = 1345.15m, EstimatedValue = 1345.15m, ImpactUnit = "pesos", Notes = "Monthly contribution", ReferralPostId = null },
            new() { DonationId = 22, SupporterId = 22, DonationType = "Monetary", DonationDate = new DateOnly(2025, 11, 13), IsRecurring = false, CampaignName = null, ChannelSource = "Campaign", CurrencyCode = "PHP", Amount = 1109.83m, EstimatedValue = 1109.83m, ImpactUnit = "pesos", Notes = "Recurring gift", ReferralPostId = null },
            new() { DonationId = 23, SupporterId = 37, DonationType = "Time", DonationDate = new DateOnly(2024, 2, 6), IsRecurring = false, CampaignName = null, ChannelSource = "Direct", CurrencyCode = null, Amount = null, EstimatedValue = 21.44m, ImpactUnit = "hours", Notes = "Campaign support", ReferralPostId = null },
            new() { DonationId = 24, SupporterId = 54, DonationType = "SocialMedia", DonationDate = new DateOnly(2023, 4, 27), IsRecurring = true, CampaignName = "Summer of Safety", ChannelSource = "PartnerReferral", CurrencyCode = null, Amount = null, EstimatedValue = 3.05m, ImpactUnit = "campaigns", Notes = "In support of safehouse operations", ReferralPostId = null },
            new() { DonationId = 25, SupporterId = 9, DonationType = "Monetary", DonationDate = new DateOnly(2024, 11, 4), IsRecurring = false, CampaignName = "Year-End Hope", ChannelSource = "SocialMedia", CurrencyCode = "PHP", Amount = 1796.47m, EstimatedValue = 1796.47m, ImpactUnit = "pesos", Notes = "Campaign support", ReferralPostId = null },
            new() { DonationId = 26, SupporterId = 29, DonationType = "Monetary", DonationDate = new DateOnly(2025, 9, 28), IsRecurring = false, CampaignName = null, ChannelSource = "Event", CurrencyCode = "PHP", Amount = 1083.86m, EstimatedValue = 1083.86m, ImpactUnit = "pesos", Notes = "Community outreach support", ReferralPostId = null },
            new() { DonationId = 27, SupporterId = 7, DonationType = "InKind", DonationDate = new DateOnly(2023, 10, 19), IsRecurring = true, CampaignName = null, ChannelSource = "Event", CurrencyCode = null, Amount = null, EstimatedValue = 826.93m, ImpactUnit = "items", Notes = "Community outreach support", ReferralPostId = null },
            new() { DonationId = 28, SupporterId = 54, DonationType = "Skills", DonationDate = new DateOnly(2025, 6, 15), IsRecurring = true, CampaignName = "Back to School", ChannelSource = "PartnerReferral", CurrencyCode = null, Amount = null, EstimatedValue = 11.27m, ImpactUnit = "hours", Notes = "Community outreach support", ReferralPostId = null },
            new() { DonationId = 29, SupporterId = 31, DonationType = "Monetary", DonationDate = new DateOnly(2023, 12, 26), IsRecurring = true, CampaignName = null, ChannelSource = "SocialMedia", CurrencyCode = "PHP", Amount = 1014.15m, EstimatedValue = 1014.15m, ImpactUnit = "pesos", Notes = "Monthly contribution", ReferralPostId = null },
            new() { DonationId = 30, SupporterId = 4, DonationType = "InKind", DonationDate = new DateOnly(2023, 3, 15), IsRecurring = true, CampaignName = null, ChannelSource = "SocialMedia", CurrencyCode = null, Amount = null, EstimatedValue = 439.51m, ImpactUnit = "items", Notes = "Monthly contribution", ReferralPostId = null },
        };
        db.Donations.AddRange(donations);
        await db.SaveChangesAsync();

        // 7. Donation Allocations (20 rows)
        var donationAllocations = new List<DonationAllocation>
        {
            new() { AllocationId = 1, DonationId = 1, SafehouseId = 2, ProgramArea = "Education", AmountAllocated = 717.18m, AllocationDate = new DateOnly(2025, 12, 31), AllocationNotes = null },
            new() { AllocationId = 2, DonationId = 2, SafehouseId = 4, ProgramArea = "Transport", AmountAllocated = 35.15m, AllocationDate = new DateOnly(2025, 12, 2), AllocationNotes = null },
            new() { AllocationId = 3, DonationId = 3, SafehouseId = 8, ProgramArea = "Wellbeing", AmountAllocated = 1074.65m, AllocationDate = new DateOnly(2024, 12, 2), AllocationNotes = null },
            new() { AllocationId = 4, DonationId = 4, SafehouseId = 9, ProgramArea = "Operations", AmountAllocated = 799.86m, AllocationDate = new DateOnly(2023, 9, 11), AllocationNotes = null },
            new() { AllocationId = 5, DonationId = 5, SafehouseId = 8, ProgramArea = "Operations", AmountAllocated = 1177.41m, AllocationDate = new DateOnly(2023, 11, 8), AllocationNotes = null },
            new() { AllocationId = 6, DonationId = 6, SafehouseId = 7, ProgramArea = "Transport", AmountAllocated = 678.86m, AllocationDate = new DateOnly(2025, 9, 18), AllocationNotes = null },
            new() { AllocationId = 7, DonationId = 7, SafehouseId = 3, ProgramArea = "Wellbeing", AmountAllocated = 18.77m, AllocationDate = new DateOnly(2024, 12, 14), AllocationNotes = null },
            new() { AllocationId = 8, DonationId = 7, SafehouseId = 5, ProgramArea = "Operations", AmountAllocated = 18.77m, AllocationDate = new DateOnly(2024, 12, 14), AllocationNotes = null },
            new() { AllocationId = 9, DonationId = 8, SafehouseId = 4, ProgramArea = "Wellbeing", AmountAllocated = 600.64m, AllocationDate = new DateOnly(2024, 11, 21), AllocationNotes = null },
            new() { AllocationId = 10, DonationId = 9, SafehouseId = 6, ProgramArea = "Outreach", AmountAllocated = 911.84m, AllocationDate = new DateOnly(2023, 9, 25), AllocationNotes = null },
            new() { AllocationId = 11, DonationId = 10, SafehouseId = 3, ProgramArea = "Maintenance", AmountAllocated = 1677.73m, AllocationDate = new DateOnly(2023, 4, 16), AllocationNotes = null },
            new() { AllocationId = 12, DonationId = 11, SafehouseId = 3, ProgramArea = "Education", AmountAllocated = 11.39m, AllocationDate = new DateOnly(2023, 2, 10), AllocationNotes = null },
            new() { AllocationId = 13, DonationId = 12, SafehouseId = 4, ProgramArea = "Education", AmountAllocated = 1773.19m, AllocationDate = new DateOnly(2024, 11, 20), AllocationNotes = null },
            new() { AllocationId = 14, DonationId = 13, SafehouseId = 1, ProgramArea = "Wellbeing", AmountAllocated = 433.32m, AllocationDate = new DateOnly(2025, 8, 30), AllocationNotes = null },
            new() { AllocationId = 15, DonationId = 14, SafehouseId = 4, ProgramArea = "Transport", AmountAllocated = 1541.75m, AllocationDate = new DateOnly(2025, 10, 7), AllocationNotes = null },
            new() { AllocationId = 16, DonationId = 15, SafehouseId = 3, ProgramArea = "Education", AmountAllocated = 150.0m, AllocationDate = new DateOnly(2023, 7, 2), AllocationNotes = null },
            new() { AllocationId = 17, DonationId = 15, SafehouseId = 8, ProgramArea = "Operations", AmountAllocated = 150.0m, AllocationDate = new DateOnly(2023, 7, 2), AllocationNotes = null },
            new() { AllocationId = 18, DonationId = 16, SafehouseId = 7, ProgramArea = "Transport", AmountAllocated = 4026.84m, AllocationDate = new DateOnly(2024, 10, 25), AllocationNotes = null },
            new() { AllocationId = 19, DonationId = 17, SafehouseId = 9, ProgramArea = "Transport", AmountAllocated = 2.79m, AllocationDate = new DateOnly(2023, 8, 11), AllocationNotes = null },
            new() { AllocationId = 20, DonationId = 18, SafehouseId = 3, ProgramArea = "Maintenance", AmountAllocated = 17.79m, AllocationDate = new DateOnly(2026, 1, 6), AllocationNotes = null },
        };
        db.DonationAllocations.AddRange(donationAllocations);
        await db.SaveChangesAsync();

        // 8. Residents (30 rows)
        var residents = new List<Resident>
        {
            new() { ResidentId = 1, CaseControlNo = "C0043", InternalCode = "LS-0001", SafehouseId = 4, CaseStatus = "Active", Sex = "F", DateOfBirth = new DateOnly(2008, 8, 31), BirthStatus = "Marital", PlaceOfBirth = "Davao City", Religion = "Unspecified", CaseCategory = "Neglected", SubCatOrphaned = false, SubCatTrafficked = false, SubCatChildLabor = false, SubCatPhysicalAbuse = false, SubCatSexualAbuse = false, SubCatOsaec = false, SubCatCicl = false, SubCatAtRisk = false, SubCatStreetChild = false, SubCatChildWithHiv = false, IsPwd = false, PwdType = null, HasSpecialNeeds = true, SpecialNeedsDiagnosis = "Speech Impairment", FamilyIs4ps = false, FamilySoloParent = false, FamilyIndigenous = false, FamilyParentPwd = false, FamilyInformalSettler = false, DateOfAdmission = new DateOnly(2023, 10, 17), AgeUponAdmission = "15 Years 9 months", PresentAge = "17 Years 6 months", LengthOfStay = "2 Years 4 months", ReferralSource = "NGO", ReferringAgencyPerson = "Ramon Cruz", DateColbRegistered = null, DateColbObtained = null, AssignedSocialWorker = "SW-15", InitialCaseAssessment = "For Reunification", DateCaseStudyPrepared = new DateOnly(2023, 12, 14), ReintegrationType = "Foster Care", ReintegrationStatus = "In Progress", InitialRiskLevel = "Critical", CurrentRiskLevel = "High", DateEnrolled = new DateOnly(2023, 10, 17), DateClosed = null, CreatedAt = new DateTime(2023, 10, 17), NotesRestricted = null },
            new() { ResidentId = 2, CaseControlNo = "C2530", InternalCode = "LS-0002", SafehouseId = 3, CaseStatus = "Closed", Sex = "F", DateOfBirth = new DateOnly(2008, 4, 23), BirthStatus = "Marital", PlaceOfBirth = "Cebu City", Religion = "Seventh-day Adventist", CaseCategory = "Surrendered", SubCatOrphaned = false, SubCatTrafficked = false, SubCatChildLabor = false, SubCatPhysicalAbuse = false, SubCatSexualAbuse = false, SubCatOsaec = false, SubCatCicl = false, SubCatAtRisk = true, SubCatStreetChild = true, SubCatChildWithHiv = false, IsPwd = false, PwdType = null, HasSpecialNeeds = false, SpecialNeedsDiagnosis = null, FamilyIs4ps = false, FamilySoloParent = false, FamilyIndigenous = true, FamilyParentPwd = false, FamilyInformalSettler = false, DateOfAdmission = new DateOnly(2023, 3, 18), AgeUponAdmission = "15 Years 5 months", PresentAge = "17 Years 10 months", LengthOfStay = "1 Years 9 months", ReferralSource = "Government Agency", ReferringAgencyPerson = "Ana Cruz", DateColbRegistered = new DateOnly(2023, 7, 6), DateColbObtained = new DateOnly(2024, 12, 30), AssignedSocialWorker = "SW-14", InitialCaseAssessment = "For Continued Care", DateCaseStudyPrepared = new DateOnly(2023, 4, 10), ReintegrationType = "Family Reunification", ReintegrationStatus = "Completed", InitialRiskLevel = "Medium", CurrentRiskLevel = "Medium", DateEnrolled = new DateOnly(2023, 3, 18), DateClosed = new DateOnly(2025, 1, 6), CreatedAt = new DateTime(2023, 3, 18), NotesRestricted = null },
            new() { ResidentId = 3, CaseControlNo = "C3946", InternalCode = "LS-0003", SafehouseId = 1, CaseStatus = "Active", Sex = "F", DateOfBirth = new DateOnly(2007, 1, 31), BirthStatus = "Marital", PlaceOfBirth = "Manila", Religion = "Roman Catholic", CaseCategory = "Surrendered", SubCatOrphaned = false, SubCatTrafficked = false, SubCatChildLabor = false, SubCatPhysicalAbuse = false, SubCatSexualAbuse = true, SubCatOsaec = false, SubCatCicl = false, SubCatAtRisk = false, SubCatStreetChild = false, SubCatChildWithHiv = false, IsPwd = false, PwdType = null, HasSpecialNeeds = false, SpecialNeedsDiagnosis = null, FamilyIs4ps = false, FamilySoloParent = false, FamilyIndigenous = false, FamilyParentPwd = false, FamilyInformalSettler = false, DateOfAdmission = new DateOnly(2024, 5, 24), AgeUponAdmission = "18 Years 3 months", PresentAge = "19 Years 1 months", LengthOfStay = "1 Years 9 months", ReferralSource = "Government Agency", ReferringAgencyPerson = null, DateColbRegistered = new DateOnly(2024, 8, 2), DateColbObtained = new DateOnly(2024, 9, 21), AssignedSocialWorker = "SW-20", InitialCaseAssessment = "For Independent Living", DateCaseStudyPrepared = null, ReintegrationType = "Foster Care", ReintegrationStatus = "Completed", InitialRiskLevel = "Medium", CurrentRiskLevel = "Medium", DateEnrolled = new DateOnly(2024, 5, 24), DateClosed = null, CreatedAt = new DateTime(2024, 5, 24), NotesRestricted = null },
            new() { ResidentId = 4, CaseControlNo = "C3116", InternalCode = "LS-0004", SafehouseId = 2, CaseStatus = "Active", Sex = "F", DateOfBirth = new DateOnly(2012, 6, 29), BirthStatus = "Marital", PlaceOfBirth = "Davao City", Religion = "Evangelical", CaseCategory = "Neglected", SubCatOrphaned = false, SubCatTrafficked = false, SubCatChildLabor = false, SubCatPhysicalAbuse = false, SubCatSexualAbuse = false, SubCatOsaec = false, SubCatCicl = true, SubCatAtRisk = false, SubCatStreetChild = false, SubCatChildWithHiv = false, IsPwd = false, PwdType = null, HasSpecialNeeds = false, SpecialNeedsDiagnosis = null, FamilyIs4ps = false, FamilySoloParent = false, FamilyIndigenous = false, FamilyParentPwd = false, FamilyInformalSettler = false, DateOfAdmission = new DateOnly(2024, 9, 27), AgeUponAdmission = "12 Years 11 months", PresentAge = "13 Years 8 months", LengthOfStay = "1 Years 5 months", ReferralSource = "Court Order", ReferringAgencyPerson = null, DateColbRegistered = null, DateColbObtained = null, AssignedSocialWorker = "SW-15", InitialCaseAssessment = "For Reunification", DateCaseStudyPrepared = new DateOnly(2024, 10, 25), ReintegrationType = "None", ReintegrationStatus = "On Hold", InitialRiskLevel = "High", CurrentRiskLevel = "Low", DateEnrolled = new DateOnly(2024, 9, 27), DateClosed = null, CreatedAt = new DateTime(2024, 9, 27), NotesRestricted = null },
            new() { ResidentId = 5, CaseControlNo = "C9132", InternalCode = "LS-0005", SafehouseId = 4, CaseStatus = "Transferred", Sex = "F", DateOfBirth = new DateOnly(2009, 4, 20), BirthStatus = "Marital", PlaceOfBirth = "Pasay City", Religion = "Buddhism", CaseCategory = "Surrendered", SubCatOrphaned = false, SubCatTrafficked = false, SubCatChildLabor = false, SubCatPhysicalAbuse = true, SubCatSexualAbuse = false, SubCatOsaec = true, SubCatCicl = false, SubCatAtRisk = false, SubCatStreetChild = false, SubCatChildWithHiv = false, IsPwd = true, PwdType = "Intellectual", HasSpecialNeeds = false, SpecialNeedsDiagnosis = null, FamilyIs4ps = true, FamilySoloParent = false, FamilyIndigenous = false, FamilyParentPwd = false, FamilyInformalSettler = false, DateOfAdmission = new DateOnly(2024, 1, 10), AgeUponAdmission = "15 Years 4 months", PresentAge = "16 Years 10 months", LengthOfStay = "0 Years 9 months", ReferralSource = "Self-Referral", ReferringAgencyPerson = "Mark Dizon", DateColbRegistered = new DateOnly(2024, 2, 18), DateColbObtained = null, AssignedSocialWorker = "SW-04", InitialCaseAssessment = "For Independent Living", DateCaseStudyPrepared = new DateOnly(2024, 2, 14), ReintegrationType = "Family Reunification", ReintegrationStatus = "Completed", InitialRiskLevel = "Medium", CurrentRiskLevel = "Low", DateEnrolled = new DateOnly(2024, 1, 10), DateClosed = new DateOnly(2024, 10, 8), CreatedAt = new DateTime(2024, 1, 10), NotesRestricted = null },
            new() { ResidentId = 6, CaseControlNo = "C7286", InternalCode = "LS-0006", SafehouseId = 5, CaseStatus = "Active", Sex = "F", DateOfBirth = new DateOnly(2006, 5, 19), BirthStatus = "Non-Marital", PlaceOfBirth = "Pasay City", Religion = "Seventh-day Adventist", CaseCategory = "Foundling", SubCatOrphaned = true, SubCatTrafficked = false, SubCatChildLabor = false, SubCatPhysicalAbuse = false, SubCatSexualAbuse = false, SubCatOsaec = true, SubCatCicl = false, SubCatAtRisk = false, SubCatStreetChild = false, SubCatChildWithHiv = false, IsPwd = false, PwdType = null, HasSpecialNeeds = false, SpecialNeedsDiagnosis = null, FamilyIs4ps = false, FamilySoloParent = true, FamilyIndigenous = false, FamilyParentPwd = false, FamilyInformalSettler = false, DateOfAdmission = new DateOnly(2023, 8, 30), AgeUponAdmission = "18 Years 10 months", PresentAge = "19 Years 9 months", LengthOfStay = "2 Years 6 months", ReferralSource = "Community", ReferringAgencyPerson = "Elena Santos", DateColbRegistered = new DateOnly(2023, 10, 13), DateColbObtained = new DateOnly(2023, 11, 8), AssignedSocialWorker = "SW-05", InitialCaseAssessment = "For Reunification", DateCaseStudyPrepared = new DateOnly(2023, 9, 29), ReintegrationType = "Family Reunification", ReintegrationStatus = "In Progress", InitialRiskLevel = "High", CurrentRiskLevel = "Medium", DateEnrolled = new DateOnly(2023, 8, 30), DateClosed = null, CreatedAt = new DateTime(2023, 8, 30), NotesRestricted = null },
            new() { ResidentId = 7, CaseControlNo = "C6898", InternalCode = "LS-0007", SafehouseId = 6, CaseStatus = "Active", Sex = "F", DateOfBirth = new DateOnly(2015, 9, 17), BirthStatus = "Marital", PlaceOfBirth = "Zamboanga City", Religion = "Evangelical", CaseCategory = "Foundling", SubCatOrphaned = false, SubCatTrafficked = false, SubCatChildLabor = false, SubCatPhysicalAbuse = false, SubCatSexualAbuse = false, SubCatOsaec = false, SubCatCicl = false, SubCatAtRisk = false, SubCatStreetChild = true, SubCatChildWithHiv = false, IsPwd = false, PwdType = null, HasSpecialNeeds = false, SpecialNeedsDiagnosis = null, FamilyIs4ps = true, FamilySoloParent = false, FamilyIndigenous = false, FamilyParentPwd = false, FamilyInformalSettler = false, DateOfAdmission = new DateOnly(2024, 6, 22), AgeUponAdmission = "9 Years 7 months", PresentAge = "10 Years 5 months", LengthOfStay = "1 Years 8 months", ReferralSource = "Self-Referral", ReferringAgencyPerson = null, DateColbRegistered = new DateOnly(2024, 10, 16), DateColbObtained = new DateOnly(2025, 5, 24), AssignedSocialWorker = "SW-04", InitialCaseAssessment = "For Reunification", DateCaseStudyPrepared = null, ReintegrationType = "Independent Living", ReintegrationStatus = "In Progress", InitialRiskLevel = "Low", CurrentRiskLevel = "Low", DateEnrolled = new DateOnly(2024, 6, 22), DateClosed = null, CreatedAt = new DateTime(2024, 6, 22), NotesRestricted = null },
            new() { ResidentId = 8, CaseControlNo = "C3744", InternalCode = "LS-0008", SafehouseId = 4, CaseStatus = "Active", Sex = "F", DateOfBirth = new DateOnly(2012, 2, 15), BirthStatus = "Marital", PlaceOfBirth = "Iloilo City", Religion = "Seventh-day Adventist", CaseCategory = "Foundling", SubCatOrphaned = false, SubCatTrafficked = false, SubCatChildLabor = true, SubCatPhysicalAbuse = false, SubCatSexualAbuse = true, SubCatOsaec = false, SubCatCicl = true, SubCatAtRisk = true, SubCatStreetChild = false, SubCatChildWithHiv = false, IsPwd = false, PwdType = null, HasSpecialNeeds = false, SpecialNeedsDiagnosis = null, FamilyIs4ps = false, FamilySoloParent = true, FamilyIndigenous = false, FamilyParentPwd = false, FamilyInformalSettler = false, DateOfAdmission = new DateOnly(2024, 2, 28), AgeUponAdmission = "12 Years 6 months", PresentAge = "14 Years 0 months", LengthOfStay = "2 Years 0 months", ReferralSource = "Court Order", ReferringAgencyPerson = "Grace Flores", DateColbRegistered = new DateOnly(2024, 3, 25), DateColbObtained = new DateOnly(2024, 10, 28), AssignedSocialWorker = "SW-05", InitialCaseAssessment = "For Independent Living", DateCaseStudyPrepared = new DateOnly(2024, 3, 12), ReintegrationType = "Adoption (Domestic)", ReintegrationStatus = "Not Started", InitialRiskLevel = "High", CurrentRiskLevel = "High", DateEnrolled = new DateOnly(2024, 2, 28), DateClosed = null, CreatedAt = new DateTime(2024, 2, 28), NotesRestricted = null },
            new() { ResidentId = 9, CaseControlNo = "C3706", InternalCode = "LS-0009", SafehouseId = 7, CaseStatus = "Active", Sex = "F", DateOfBirth = new DateOnly(2013, 2, 25), BirthStatus = "Marital", PlaceOfBirth = "Quezon City", Religion = "Buddhism", CaseCategory = "Surrendered", SubCatOrphaned = true, SubCatTrafficked = false, SubCatChildLabor = false, SubCatPhysicalAbuse = false, SubCatSexualAbuse = false, SubCatOsaec = false, SubCatCicl = false, SubCatAtRisk = false, SubCatStreetChild = true, SubCatChildWithHiv = false, IsPwd = false, PwdType = null, HasSpecialNeeds = true, SpecialNeedsDiagnosis = "Learning Disability", FamilyIs4ps = true, FamilySoloParent = false, FamilyIndigenous = false, FamilyParentPwd = false, FamilyInformalSettler = false, DateOfAdmission = new DateOnly(2025, 4, 6), AgeUponAdmission = "12 Years 9 months", PresentAge = "13 Years 0 months", LengthOfStay = "0 Years 10 months", ReferralSource = "Government Agency", ReferringAgencyPerson = "Ramon Reyes", DateColbRegistered = new DateOnly(2025, 6, 14), DateColbObtained = new DateOnly(2026, 1, 17), AssignedSocialWorker = "SW-16", InitialCaseAssessment = "For Continued Care", DateCaseStudyPrepared = new DateOnly(2025, 5, 10), ReintegrationType = "Foster Care", ReintegrationStatus = "Not Started", InitialRiskLevel = "Medium", CurrentRiskLevel = "Low", DateEnrolled = new DateOnly(2025, 4, 6), DateClosed = null, CreatedAt = new DateTime(2025, 4, 6), NotesRestricted = null },
            new() { ResidentId = 10, CaseControlNo = "C1817", InternalCode = "LS-0010", SafehouseId = 1, CaseStatus = "Active", Sex = "F", DateOfBirth = new DateOnly(2008, 8, 31), BirthStatus = "Marital", PlaceOfBirth = "Makati City", Religion = "Other", CaseCategory = "Surrendered", SubCatOrphaned = false, SubCatTrafficked = true, SubCatChildLabor = false, SubCatPhysicalAbuse = false, SubCatSexualAbuse = false, SubCatOsaec = false, SubCatCicl = false, SubCatAtRisk = true, SubCatStreetChild = false, SubCatChildWithHiv = false, IsPwd = false, PwdType = null, HasSpecialNeeds = false, SpecialNeedsDiagnosis = null, FamilyIs4ps = true, FamilySoloParent = false, FamilyIndigenous = false, FamilyParentPwd = false, FamilyInformalSettler = false, DateOfAdmission = new DateOnly(2023, 10, 18), AgeUponAdmission = "15 Years 7 months", PresentAge = "17 Years 6 months", LengthOfStay = "2 Years 4 months", ReferralSource = "Government Agency", ReferringAgencyPerson = null, DateColbRegistered = new DateOnly(2024, 3, 12), DateColbObtained = new DateOnly(2025, 12, 27), AssignedSocialWorker = "SW-14", InitialCaseAssessment = "For Adoption", DateCaseStudyPrepared = new DateOnly(2023, 10, 20), ReintegrationType = "Foster Care", ReintegrationStatus = "On Hold", InitialRiskLevel = "High", CurrentRiskLevel = "Low", DateEnrolled = new DateOnly(2023, 10, 18), DateClosed = null, CreatedAt = new DateTime(2023, 10, 18), NotesRestricted = null },
            new() { ResidentId = 11, CaseControlNo = "C5929", InternalCode = "LS-0011", SafehouseId = 1, CaseStatus = "Closed", Sex = "F", DateOfBirth = new DateOnly(2005, 11, 12), BirthStatus = "Marital", PlaceOfBirth = "Iloilo City", Religion = "Buddhism", CaseCategory = "Surrendered", SubCatOrphaned = false, SubCatTrafficked = false, SubCatChildLabor = false, SubCatPhysicalAbuse = true, SubCatSexualAbuse = false, SubCatOsaec = false, SubCatCicl = false, SubCatAtRisk = false, SubCatStreetChild = false, SubCatChildWithHiv = false, IsPwd = false, PwdType = null, HasSpecialNeeds = false, SpecialNeedsDiagnosis = null, FamilyIs4ps = true, FamilySoloParent = true, FamilyIndigenous = false, FamilyParentPwd = false, FamilyInformalSettler = false, DateOfAdmission = new DateOnly(2023, 4, 1), AgeUponAdmission = "18 Years 6 months", PresentAge = "20 Years 3 months", LengthOfStay = "1 Years 8 months", ReferralSource = "Court Order", ReferringAgencyPerson = "Ramon Flores", DateColbRegistered = new DateOnly(2023, 8, 23), DateColbObtained = new DateOnly(2024, 7, 7), AssignedSocialWorker = "SW-11", InitialCaseAssessment = "For Adoption", DateCaseStudyPrepared = new DateOnly(2023, 4, 9), ReintegrationType = "Adoption (Domestic)", ReintegrationStatus = "Completed", InitialRiskLevel = "Low", CurrentRiskLevel = "Low", DateEnrolled = new DateOnly(2023, 4, 1), DateClosed = new DateOnly(2024, 12, 18), CreatedAt = new DateTime(2023, 4, 1), NotesRestricted = null },
            new() { ResidentId = 12, CaseControlNo = "C5767", InternalCode = "LS-0012", SafehouseId = 3, CaseStatus = "Active", Sex = "F", DateOfBirth = new DateOnly(2015, 5, 19), BirthStatus = "Marital", PlaceOfBirth = "Manila", Religion = "Evangelical", CaseCategory = "Abandoned", SubCatOrphaned = false, SubCatTrafficked = false, SubCatChildLabor = true, SubCatPhysicalAbuse = false, SubCatSexualAbuse = false, SubCatOsaec = false, SubCatCicl = false, SubCatAtRisk = false, SubCatStreetChild = true, SubCatChildWithHiv = false, IsPwd = false, PwdType = null, HasSpecialNeeds = false, SpecialNeedsDiagnosis = null, FamilyIs4ps = false, FamilySoloParent = false, FamilyIndigenous = false, FamilyParentPwd = false, FamilyInformalSettler = false, DateOfAdmission = new DateOnly(2024, 6, 3), AgeUponAdmission = "9 Years 7 months", PresentAge = "10 Years 9 months", LengthOfStay = "1 Years 9 months", ReferralSource = "Government Agency", ReferringAgencyPerson = "Elena Reyes", DateColbRegistered = new DateOnly(2024, 9, 23), DateColbObtained = null, AssignedSocialWorker = "SW-17", InitialCaseAssessment = "For Continued Care", DateCaseStudyPrepared = new DateOnly(2024, 7, 19), ReintegrationType = "Adoption (Domestic)", ReintegrationStatus = "In Progress", InitialRiskLevel = "High", CurrentRiskLevel = "High", DateEnrolled = new DateOnly(2024, 6, 3), DateClosed = null, CreatedAt = new DateTime(2024, 6, 3), NotesRestricted = null },
            new() { ResidentId = 13, CaseControlNo = "C9796", InternalCode = "LS-0013", SafehouseId = 2, CaseStatus = "Closed", Sex = "F", DateOfBirth = new DateOnly(2014, 5, 12), BirthStatus = "Marital", PlaceOfBirth = "Antipolo", Religion = "Jehovah's Witness", CaseCategory = "Surrendered", SubCatOrphaned = false, SubCatTrafficked = false, SubCatChildLabor = true, SubCatPhysicalAbuse = false, SubCatSexualAbuse = false, SubCatOsaec = false, SubCatCicl = false, SubCatAtRisk = false, SubCatStreetChild = false, SubCatChildWithHiv = false, IsPwd = false, PwdType = null, HasSpecialNeeds = false, SpecialNeedsDiagnosis = null, FamilyIs4ps = false, FamilySoloParent = false, FamilyIndigenous = false, FamilyParentPwd = false, FamilyInformalSettler = false, DateOfAdmission = new DateOnly(2023, 2, 23), AgeUponAdmission = "9 Years 8 months", PresentAge = "11 Years 9 months", LengthOfStay = "1 Years 5 months", ReferralSource = "Community", ReferringAgencyPerson = "Joy Cruz", DateColbRegistered = new DateOnly(2023, 4, 18), DateColbObtained = new DateOnly(2024, 5, 14), AssignedSocialWorker = "SW-16", InitialCaseAssessment = "For Foster Care", DateCaseStudyPrepared = new DateOnly(2023, 3, 12), ReintegrationType = "Adoption (Domestic)", ReintegrationStatus = "Completed", InitialRiskLevel = "Medium", CurrentRiskLevel = "Low", DateEnrolled = new DateOnly(2023, 2, 23), DateClosed = new DateOnly(2024, 7, 29), CreatedAt = new DateTime(2023, 2, 23), NotesRestricted = null },
        };
        // Adding 17 more residents as minimal stubs (IDs 14-30) to reach 30
        for (int i = 14; i <= 30; i++)
        {
            residents.Add(new Resident
            {
                ResidentId = i,
                CaseControlNo = $"C{i:D4}",
                InternalCode = $"LS-{i:D4}",
                SafehouseId = ((i - 1) % 9) + 1,
                CaseStatus = "Active",
                Sex = "F",
                DateOfBirth = new DateOnly(2010, 1, 1).AddDays(i * 30),
                BirthStatus = "Marital",
                PlaceOfBirth = "Manila",
                Religion = "Roman Catholic",
                CaseCategory = "Surrendered",
                SubCatOrphaned = false, SubCatTrafficked = false, SubCatChildLabor = false,
                SubCatPhysicalAbuse = false, SubCatSexualAbuse = false, SubCatOsaec = false,
                SubCatCicl = false, SubCatAtRisk = false, SubCatStreetChild = false, SubCatChildWithHiv = false,
                IsPwd = false, HasSpecialNeeds = false,
                FamilyIs4ps = false, FamilySoloParent = false, FamilyIndigenous = false,
                FamilyParentPwd = false, FamilyInformalSettler = false,
                DateOfAdmission = new DateOnly(2023, 6, 1).AddDays(i * 15),
                AgeUponAdmission = "12 Years",
                PresentAge = "14 Years",
                LengthOfStay = "2 Years",
                ReferralSource = "Government Agency",
                AssignedSocialWorker = $"SW-{(i % 20) + 1:D2}",
                InitialCaseAssessment = "For Continued Care",
                ReintegrationType = "Family Reunification",
                ReintegrationStatus = "In Progress",
                InitialRiskLevel = "Medium",
                CurrentRiskLevel = "Low",
                DateEnrolled = new DateOnly(2023, 6, 1).AddDays(i * 15),
                CreatedAt = new DateTime(2023, 6, 1).AddDays(i * 15),
            });
        }
        db.Residents.AddRange(residents);
        await db.SaveChangesAsync();

        // 9. Process Recordings (50 rows)
        var processRecordings = new List<ProcessRecording>();
        string[] emotionsStart = { "Angry", "Distressed", "Anxious", "Hopeful", "Happy", "Calm", "Sad", "Withdrawn" };
        string[] emotionsEnd = { "Hopeful", "Sad", "Calm", "Happy" };
        string[] sessionTypes = { "Individual", "Group" };
        string[] interventions = { "Caring", "Legal Services", "Healing", "Teaching" };
        string[] followUps = { "Referral to specialist", "Schedule follow-up session", "Continue current approach", "Coordinate with family", "Monitor progress" };
        for (int i = 1; i <= 50; i++)
        {
            processRecordings.Add(new ProcessRecording
            {
                RecordingId = i,
                ResidentId = ((i - 1) % 13) + 1,
                SessionDate = new DateOnly(2023, 11, 1).AddDays(i * 5),
                SocialWorker = $"SW-{(i % 20) + 1:D2}",
                SessionType = sessionTypes[i % 2],
                SessionDurationMinutes = 30 + (i * 7) % 90,
                EmotionalStateObserved = emotionsStart[i % emotionsStart.Length],
                EmotionalStateEnd = emotionsEnd[i % emotionsEnd.Length],
                SessionNarrative = $"Session with resident. Type: {sessionTypes[i % 2]}. Duration: {30 + (i * 7) % 90} minutes.",
                InterventionsApplied = interventions[i % interventions.Length],
                FollowUpActions = followUps[i % followUps.Length],
                ProgressNoted = true,
                ConcernsFlagged = i % 5 == 0,
                ReferralMade = i % 7 == 0,
                NotesRestricted = null,
            });
        }
        db.ProcessRecordings.AddRange(processRecordings);
        await db.SaveChangesAsync();

        // 10. Home Visitations (30 rows)
        var homeVisitations = new List<HomeVisitation>();
        string[] visitTypes = { "Routine Follow-Up", "Post-Placement Monitoring", "Reintegration Assessment", "Emergency" };
        string[] locations = { "Family Home", "Proposed Foster Home", "Community Center", "Church", "Barangay Office", "School" };
        string[] cooperationLevels = { "Cooperative", "Highly Cooperative", "Neutral", "Uncooperative" };
        string[] outcomes = { "Favorable", "Needs Improvement", "Unfavorable", "Inconclusive" };
        for (int i = 1; i <= 30; i++)
        {
            homeVisitations.Add(new HomeVisitation
            {
                VisitationId = i,
                ResidentId = ((i - 1) % 13) + 1,
                VisitDate = new DateOnly(2023, 11, 1).AddDays(i * 12),
                SocialWorker = $"SW-{(i % 20) + 1:D2}",
                VisitType = visitTypes[i % visitTypes.Length],
                LocationVisited = locations[i % locations.Length],
                FamilyMembersPresent = i % 3 == 0 ? "None" : "Cruz (Parent); Lopez (Sibling)",
                Purpose = $"Visitation for {visitTypes[i % visitTypes.Length].ToLower()}",
                Observations = $"Visit observations recorded during {visitTypes[i % visitTypes.Length].ToLower()}.",
                FamilyCooperationLevel = cooperationLevels[i % cooperationLevels.Length],
                SafetyConcernsNoted = i % 5 == 0,
                FollowUpNeeded = i % 3 != 0,
                FollowUpNotes = i % 2 == 0 ? "Follow-up scheduled" : null,
                VisitOutcome = outcomes[i % outcomes.Length],
            });
        }
        db.HomeVisitations.AddRange(homeVisitations);
        await db.SaveChangesAsync();

        // 11. Education Records (30 rows)
        var educationRecords = new List<EducationRecord>();
        string[] eduLevels = { "Primary", "Secondary", "Vocational", "CollegePrep" };
        string[] completionStatuses = { "NotStarted", "InProgress", "Completed" };
        for (int i = 1; i <= 30; i++)
        {
            educationRecords.Add(new EducationRecord
            {
                EducationRecordId = i,
                ResidentId = ((i - 1) / 3) + 1,
                RecordDate = new DateOnly(2023, 10, 1).AddMonths((i - 1) % 12),
                EducationLevel = eduLevels[i % eduLevels.Length],
                SchoolName = $"School {(i % 20) + 1}",
                EnrollmentStatus = "Enrolled",
                AttendanceRate = 0.5m + (decimal)(i % 50) / 100m,
                ProgressPercent = 30m + (decimal)(i * 2) % 70m,
                CompletionStatus = completionStatuses[i < 25 ? 1 : 2],
                Notes = $"Progress: {completionStatuses[i < 25 ? 1 : 2]}",
            });
        }
        db.EducationRecords.AddRange(educationRecords);
        await db.SaveChangesAsync();

        // 12. Health Wellbeing Records (30 rows)
        var healthRecords = new List<HealthWellbeingRecord>();
        for (int i = 1; i <= 30; i++)
        {
            healthRecords.Add(new HealthWellbeingRecord
            {
                HealthRecordId = i,
                ResidentId = ((i - 1) / 3) + 1,
                RecordDate = new DateOnly(2023, 10, 1).AddMonths((i - 1) % 12),
                GeneralHealthScore = 3.0m + (decimal)(i % 10) / 20m,
                NutritionScore = 2.8m + (decimal)(i % 15) / 20m,
                SleepQualityScore = 2.9m + (decimal)(i % 12) / 20m,
                EnergyLevelScore = 2.8m + (decimal)(i % 10) / 20m,
                HeightCm = 148m + (decimal)(i % 10),
                WeightKg = 35m + (decimal)(i % 10),
                Bmi = 16m + (decimal)(i % 5) / 2m,
                MedicalCheckupDone = i % 3 == 0,
                DentalCheckupDone = i % 4 == 0,
                PsychologicalCheckupDone = i % 5 == 0,
                Notes = "Health status: Stable",
            });
        }
        db.HealthWellbeingRecords.AddRange(healthRecords);
        await db.SaveChangesAsync();

        // 13. Intervention Plans (20 rows)
        var interventionPlans = new List<InterventionPlan>();
        string[] planCategories = { "Safety", "Education", "Physical Health" };
        string[] planStatuses = { "Open", "In Progress", "On Hold", "Achieved" };
        for (int i = 1; i <= 20; i++)
        {
            interventionPlans.Add(new InterventionPlan
            {
                PlanId = i,
                ResidentId = ((i - 1) / 3) + 1,
                PlanCategory = planCategories[(i - 1) % 3],
                PlanDescription = planCategories[(i - 1) % 3] switch
                {
                    "Safety" => "Maintain a stable and safe environment",
                    "Education" => "Improve participation and course completion",
                    "Physical Health" => "Improve nutrition and overall wellbeing",
                    _ => "General plan"
                },
                ServicesProvided = "Healing, Teaching, Caring",
                TargetValue = planCategories[(i - 1) % 3] == "Education" ? 0.85m : 4.2m,
                TargetDate = new DateOnly(2024, 1, 1).AddMonths(i),
                Status = planStatuses[i % planStatuses.Length],
                CaseConferenceDate = i % 3 == 0 ? null : new DateOnly(2023, 10, 1).AddMonths(i),
                CreatedAt = new DateTime(2023, 10, 1).AddMonths(((i - 1) / 3)),
                UpdatedAt = new DateTime(2024, 3, 1).AddMonths(((i - 1) / 3)),
            });
        }
        db.InterventionPlans.AddRange(interventionPlans);
        await db.SaveChangesAsync();

        // 14. Incident Reports (20 rows)
        var incidentReports = new List<IncidentReport>();
        string[] incidentTypes = { "Medical", "Security", "RunawayAttempt", "Behavioral", "SelfHarm", "ConflictWithPeer" };
        string[] severities = { "Low", "Medium", "High" };
        for (int i = 1; i <= 20; i++)
        {
            var date = new DateOnly(2024, 1, 1).AddDays(i * 18);
            incidentReports.Add(new IncidentReport
            {
                IncidentId = i,
                ResidentId = ((i - 1) % 13) + 1,
                SafehouseId = ((i - 1) % 9) + 1,
                IncidentDate = date,
                IncidentType = incidentTypes[i % incidentTypes.Length],
                Severity = severities[i % severities.Length],
                Description = $"{incidentTypes[i % incidentTypes.Length]} incident reported on {date}",
                ResponseTaken = $"Response to {incidentTypes[i % incidentTypes.Length].ToLower()}",
                Resolved = i % 3 != 0,
                ResolutionDate = i % 3 != 0 ? date.AddDays(7) : null,
                ReportedBy = $"SW-{(i % 20) + 1:D2}",
                FollowUpRequired = i % 2 == 0,
            });
        }
        db.IncidentReports.AddRange(incidentReports);
        await db.SaveChangesAsync();

        // 15. Safehouse Monthly Metrics (20 rows)
        var metrics = new List<SafehouseMonthlyMetric>();
        for (int i = 1; i <= 20; i++)
        {
            var monthStart = new DateOnly(2023, 1, 1).AddMonths(i - 1);
            var monthEnd = monthStart.AddMonths(1).AddDays(-1);
            metrics.Add(new SafehouseMonthlyMetric
            {
                MetricId = i,
                SafehouseId = ((i - 1) % 9) + 1,
                MonthStart = monthStart,
                MonthEnd = monthEnd,
                ActiveResidents = 6 + (i % 7),
                AvgEducationProgress = i > 2 ? 50m + (decimal)(i * 2) : null,
                AvgHealthScore = i > 2 ? 3.0m + (decimal)(i % 5) / 10m : null,
                ProcessRecordingCount = i * 2,
                HomeVisitationCount = i,
                IncidentCount = i % 4,
                Notes = null,
            });
        }
        db.SafehouseMonthlyMetrics.AddRange(metrics);
        await db.SaveChangesAsync();

        // 16. Public Impact Snapshots (5 rows)
        var snapshots = new List<PublicImpactSnapshot>
        {
            new() { SnapshotId = 1, SnapshotDate = new DateOnly(2023, 1, 1), Headline = "Lighthouse Sanctuary Impact Update - January 2023", SummaryText = "Anonymized aggregate report: 60 residents active, average health score 3.03, average education progress 33.9%.", MetricPayloadJson = "{'month': '2023-01', 'avg_health_score': 3.03, 'avg_education_progress': 33.9, 'total_residents': 60, 'donations_total_for_month': 1379.92}", IsPublished = true, PublishedAt = new DateOnly(2023, 1, 1) },
            new() { SnapshotId = 2, SnapshotDate = new DateOnly(2023, 2, 1), Headline = "Lighthouse Sanctuary Impact Update - February 2023", SummaryText = "Anonymized aggregate report: 60 residents active, average health score 3.13, average education progress 51.05%.", MetricPayloadJson = "{'month': '2023-02', 'avg_health_score': 3.13, 'avg_education_progress': 51.05, 'total_residents': 60, 'donations_total_for_month': 2065.15}", IsPublished = true, PublishedAt = new DateOnly(2023, 2, 1) },
            new() { SnapshotId = 3, SnapshotDate = new DateOnly(2023, 3, 1), Headline = "Lighthouse Sanctuary Impact Update - March 2023", SummaryText = "Anonymized aggregate report: 60 residents active, average health score 3.16, average education progress 60.57%.", MetricPayloadJson = "{'month': '2023-03', 'avg_health_score': 3.16, 'avg_education_progress': 60.57, 'total_residents': 60, 'donations_total_for_month': 9577.83}", IsPublished = true, PublishedAt = new DateOnly(2023, 3, 1) },
            new() { SnapshotId = 4, SnapshotDate = new DateOnly(2023, 4, 1), Headline = "Lighthouse Sanctuary Impact Update - April 2023", SummaryText = "Anonymized aggregate report: 60 residents active, average health score 3.2, average education progress 69.15%.", MetricPayloadJson = "{'month': '2023-04', 'avg_health_score': 3.2, 'avg_education_progress': 69.15, 'total_residents': 60, 'donations_total_for_month': 5401.47}", IsPublished = true, PublishedAt = new DateOnly(2023, 4, 1) },
            new() { SnapshotId = 5, SnapshotDate = new DateOnly(2023, 5, 1), Headline = "Lighthouse Sanctuary Impact Update - May 2023", SummaryText = "Anonymized aggregate report: 60 residents active, average health score 3.2, average education progress 78.85%.", MetricPayloadJson = "{'month': '2023-05', 'avg_health_score': 3.2, 'avg_education_progress': 78.85, 'total_residents': 60, 'donations_total_for_month': 4862.09}", IsPublished = true, PublishedAt = new DateOnly(2023, 5, 1) },
        };
        db.PublicImpactSnapshots.AddRange(snapshots);
        await db.SaveChangesAsync();

        await ResetSequencesAsync(db);
    }

    public static async Task ResetSequencesAsync(AppDbContext db)
    {
        var sequenceResets = new[]
        {
            "SELECT setval(pg_get_serial_sequence('safehouses', 'safehouse_id'), (SELECT COALESCE(MAX(safehouse_id), 0) FROM safehouses))",
            "SELECT setval(pg_get_serial_sequence('partners', 'partner_id'), (SELECT COALESCE(MAX(partner_id), 0) FROM partners))",
            "SELECT setval(pg_get_serial_sequence('partner_assignments', 'assignment_id'), (SELECT COALESCE(MAX(assignment_id), 0) FROM partner_assignments))",
            "SELECT setval(pg_get_serial_sequence('supporters', 'supporter_id'), (SELECT COALESCE(MAX(supporter_id), 0) FROM supporters))",
            "SELECT setval(pg_get_serial_sequence('social_media_posts', 'post_id'), (SELECT COALESCE(MAX(post_id), 0) FROM social_media_posts))",
            "SELECT setval(pg_get_serial_sequence('donations', 'donation_id'), (SELECT COALESCE(MAX(donation_id), 0) FROM donations))",
            "SELECT setval(pg_get_serial_sequence('donation_allocations', 'allocation_id'), (SELECT COALESCE(MAX(allocation_id), 0) FROM donation_allocations))",
            "SELECT setval(pg_get_serial_sequence('residents', 'resident_id'), (SELECT COALESCE(MAX(resident_id), 0) FROM residents))",
            "SELECT setval(pg_get_serial_sequence('process_recordings', 'recording_id'), (SELECT COALESCE(MAX(recording_id), 0) FROM process_recordings))",
            "SELECT setval(pg_get_serial_sequence('home_visitations', 'visitation_id'), (SELECT COALESCE(MAX(visitation_id), 0) FROM home_visitations))",
            "SELECT setval(pg_get_serial_sequence('education_records', 'education_record_id'), (SELECT COALESCE(MAX(education_record_id), 0) FROM education_records))",
            "SELECT setval(pg_get_serial_sequence('health_wellbeing_records', 'health_record_id'), (SELECT COALESCE(MAX(health_record_id), 0) FROM health_wellbeing_records))",
            "SELECT setval(pg_get_serial_sequence('intervention_plans', 'plan_id'), (SELECT COALESCE(MAX(plan_id), 0) FROM intervention_plans))",
            "SELECT setval(pg_get_serial_sequence('incident_reports', 'incident_id'), (SELECT COALESCE(MAX(incident_id), 0) FROM incident_reports))",
            "SELECT setval(pg_get_serial_sequence('safehouse_monthly_metrics', 'metric_id'), (SELECT COALESCE(MAX(metric_id), 0) FROM safehouse_monthly_metrics))",
            "SELECT setval(pg_get_serial_sequence('public_impact_snapshots', 'snapshot_id'), (SELECT COALESCE(MAX(snapshot_id), 0) FROM public_impact_snapshots))",
        };

        foreach (var sql in sequenceResets)
        {
            try
            {
                await db.Database.ExecuteSqlRawAsync(sql);
            }
            catch
            {
                // Sequence may not exist if using a non-PostgreSQL database
            }
        }
    }

    /// <summary>
    /// Idempotent data fixups applied on every startup.
    /// - Rename "Lighthouse Safehouse N" → "Safehouse N"
    /// - Increase capacity_girls by 4 (only if not already increased)
    /// </summary>
    public static async Task ApplyDataFixupsAsync(AppDbContext db)
    {
        var safehouses = await db.Safehouses.ToListAsync();
        var changed = false;

        foreach (var sh in safehouses)
        {
            // Rename: strip "Lighthouse " prefix
            if (sh.Name != null && sh.Name.StartsWith("Lighthouse "))
            {
                sh.Name = sh.Name.Replace("Lighthouse ", "");
                changed = true;
            }

            // Increase capacity by 4 — use a marker in Notes to make it idempotent
            if (sh.Notes == null || !sh.Notes.Contains("[cap+4]"))
            {
                sh.CapacityGirls = (sh.CapacityGirls ?? 0) + 4;
                sh.Notes = string.IsNullOrEmpty(sh.Notes) ? "[cap+4]" : sh.Notes + " [cap+4]";
                changed = true;
            }
        }

        if (changed)
        {
            await db.SaveChangesAsync();
        }

        // Fix health_wellbeing_records: columns were swapped during CSV import.
        // Re-import from CSV if any score is wrong (> 5 means it holds height/weight/bmi,
        // or == 5.00 means it was previously clamped by a bad fixup).
        // Detect by checking if most general_health_scores equal exactly 5.00.
        var healthCount = await db.HealthWellbeingRecords.CountAsync();
        bool needsReimport;
        if (healthCount == 0)
        {
            // Table is empty (likely from a failed prior reimport) — reimport
            needsReimport = true;
        }
        else
        {
            var sampleScores = await db.HealthWellbeingRecords
                .OrderBy(h => h.HealthRecordId)
                .Take(20)
                .Select(h => h.GeneralHealthScore)
                .ToListAsync();
            needsReimport = sampleScores.Count(s => s == 5.00m || s > 5m) > sampleScores.Count / 2;
        }

        if (needsReimport)
        {
            await ReimportHealthRecordsFromCsvAsync(db);
        }
    }

    private static async Task ReimportHealthRecordsFromCsvAsync(AppDbContext db)
    {
        // Find the repo root by walking up from CWD or BaseDirectory until we find "data/"
        string? csvPath = null;
        foreach (var start in new[] { Directory.GetCurrentDirectory(), AppContext.BaseDirectory })
        {
            var dir = start;
            for (int depth = 0; depth < 8 && dir != null; depth++)
            {
                var candidate = Path.Combine(dir, "data", "health_wellbeing_records.csv");
                if (File.Exists(candidate))
                {
                    csvPath = candidate;
                    break;
                }
                dir = Directory.GetParent(dir)?.FullName;
            }
            if (csvPath != null) break;
        }
        if (csvPath == null)
        {
            Console.WriteLine($"Health CSV not found — skipping reimport. CWD={Directory.GetCurrentDirectory()}, BaseDir={AppContext.BaseDirectory}");
            return;
        }

        Console.WriteLine($"Re-importing health records from {csvPath}...");

        // Delete all existing records (if any)
        var existing = await db.HealthWellbeingRecords.CountAsync();
        if (existing > 0)
        {
            // Use raw SQL for speed on large tables
            await db.Database.ExecuteSqlRawAsync("DELETE FROM health_wellbeing_records");
        }

        // Parse CSV and insert with correct column mapping
        var lines = await File.ReadAllLinesAsync(csvPath);
        var records = new List<HealthWellbeingRecord>();
        for (int i = 1; i < lines.Length; i++) // skip header
        {
            var cols = lines[i].Split(',');
            if (cols.Length < 14) continue;

            records.Add(new HealthWellbeingRecord
            {
                HealthRecordId = int.Parse(cols[0]),
                ResidentId = int.Parse(cols[1]),
                RecordDate = DateOnly.Parse(cols[2]),
                GeneralHealthScore = decimal.Parse(cols[3]),
                NutritionScore = decimal.Parse(cols[4]),
                SleepQualityScore = decimal.Parse(cols[5]),
                EnergyLevelScore = decimal.Parse(cols[6]),
                HeightCm = decimal.Parse(cols[7]),
                WeightKg = decimal.Parse(cols[8]),
                Bmi = decimal.Parse(cols[9]),
                MedicalCheckupDone = bool.Parse(cols[10]),
                DentalCheckupDone = bool.Parse(cols[11]),
                PsychologicalCheckupDone = bool.Parse(cols[12]),
                Notes = cols.Length > 13 ? cols[13] : null,
            });
        }

        db.HealthWellbeingRecords.AddRange(records);
        await db.SaveChangesAsync();

        // Reset sequence
        try
        {
            var maxId = records.Max(r => r.HealthRecordId);
            await db.Database.ExecuteSqlRawAsync(
                $"SELECT setval(pg_get_serial_sequence('health_wellbeing_records', 'health_record_id'), {maxId})");
        }
        catch { /* non-PG database */ }

        Console.WriteLine($"Re-imported {records.Count} health records with correct column mapping.");
    }
}
