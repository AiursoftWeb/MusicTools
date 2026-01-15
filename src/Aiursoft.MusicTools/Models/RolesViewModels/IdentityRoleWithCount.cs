using Microsoft.AspNetCore.Identity;

namespace Aiursoft.MusicTools.Models.RolesViewModels;

public class IdentityRoleWithCount
{
    public required IdentityRole Role { get; init; }
    public required int UserCount { get; init; }
}