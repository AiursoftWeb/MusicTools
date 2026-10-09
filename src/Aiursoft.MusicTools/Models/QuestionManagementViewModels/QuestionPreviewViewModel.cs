using Aiursoft.UiStack.Layout;
using Aiursoft.MusicTools.Entities;

namespace Aiursoft.MusicTools.Models.QuestionManagementViewModels;

public class QuestionPreviewViewModel : UiStackLayoutViewModel
{
    public QuestionPreviewViewModel() => PageTitle = "Question Preview";

    public required Question Question { get; init; }

    public Dictionary<Guid, int> Pitches { get; init; } = [];
}
