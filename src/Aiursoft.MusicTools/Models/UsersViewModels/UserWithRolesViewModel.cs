using Aiursoft.MusicTools.Entities;

namespace Aiursoft.MusicTools.Models.UsersViewModels;

public class UserWithRolesViewModel
{
    public required User User { get; set; }
    public required IList<string> Roles { get; set; }
}