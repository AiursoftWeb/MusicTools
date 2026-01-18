using Aiursoft.MusicTools.Entities;
using Aiursoft.UiStack.Layout;

namespace Aiursoft.MusicTools.Models.UsersViewModels;

public class DeleteViewModel : UiStackLayoutViewModel
{
    public DeleteViewModel()
    {
        PageTitle = "Delete User";
    }

    public required User User { get; set; }
}
