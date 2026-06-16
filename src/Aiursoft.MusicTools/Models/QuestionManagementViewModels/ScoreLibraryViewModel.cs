using Aiursoft.MusicTools.Entities;
using Aiursoft.UiStack.Layout;

namespace Aiursoft.MusicTools.Models.QuestionManagementViewModels;

public class ScoreLibraryViewModel : UiStackLayoutViewModel
{
    public ScoreLibraryViewModel() => PageTitle = "Score Library";
    public List<Score> Scores { get; set; } = new();
}
