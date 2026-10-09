using Aiursoft.UiStack.Layout;
using Aiursoft.MusicTools.Entities;

namespace Aiursoft.MusicTools.Models.QuestionManagementViewModels;

public class ScorePreviewViewModel : UiStackLayoutViewModel
{
    public ScorePreviewViewModel() => PageTitle = "Score Preview";

    public required Score Score { get; init; }
}
