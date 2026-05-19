using Aiursoft.UiStack.Layout;

namespace Aiursoft.MusicTools.Models.QuestionManagementViewModels;

public class QuestionPreviewViewModel : UiStackLayoutViewModel
{
    public QuestionPreviewViewModel() => PageTitle = "Question Preview";

    public string Title { get; set; } = string.Empty;
    public string ScoreName { get; set; } = string.Empty;
    public string ScorePath { get; set; } = string.Empty;
    public int StartMeasureIndex { get; set; }
    public int MeasureCount { get; set; } = 4;
}
