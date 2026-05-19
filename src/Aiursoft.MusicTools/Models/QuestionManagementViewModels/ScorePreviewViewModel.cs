using Aiursoft.UiStack.Layout;

namespace Aiursoft.MusicTools.Models.QuestionManagementViewModels;

public class ScorePreviewViewModel : UiStackLayoutViewModel
{
    public ScorePreviewViewModel() => PageTitle = "Score Preview";

    public string ScoreName { get; set; } = string.Empty;
    public string ScorePath { get; set; } = string.Empty;
}
