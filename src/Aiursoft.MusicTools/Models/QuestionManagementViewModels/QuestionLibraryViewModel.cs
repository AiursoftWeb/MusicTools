using Aiursoft.MusicTools.Entities;
using Aiursoft.UiStack.Layout;

namespace Aiursoft.MusicTools.Models.QuestionManagementViewModels;

public class QuestionLibraryViewModel : UiStackLayoutViewModel
{
    public QuestionLibraryViewModel() => PageTitle = "Question Library";
    public List<Question> Questions { get; set; } = new();
}
