using System.ComponentModel.DataAnnotations;

namespace backend.DTOs;

public static class DtoValidator
{
    public static (bool IsValid, string? Error) Validate<T>(T obj)
    {
        var results = new List<ValidationResult>();
        var context = new ValidationContext(obj!);
        if (Validator.TryValidateObject(obj!, context, results, validateAllProperties: true))
            return (true, null);
        return (false, string.Join("; ", results.Select(r => r.ErrorMessage)));
    }
}
