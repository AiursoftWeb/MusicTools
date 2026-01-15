using Aiursoft.UiStack.Layout;

namespace Aiursoft.MusicTools.Models.ManageViewModels;

public class IndexViewModel: UiStackLayoutViewModel
{
    public IndexViewModel()
    {
        PageTitle = "Manage";
    }

    public bool AllowUserAdjustNickname { get; set; }
}
