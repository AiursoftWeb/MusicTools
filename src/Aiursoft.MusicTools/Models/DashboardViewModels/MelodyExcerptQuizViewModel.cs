using Aiursoft.MusicTools.Entities;
using Aiursoft.UiStack.Layout;

namespace Aiursoft.MusicTools.Models.DashboardViewModels;

public class MelodyExcerptQuizViewModel : UiStackLayoutViewModel
{
    public MelodyExcerptQuizViewModel()
    {
        PageTitle = "Melody Excerpt Quiz";
    }

    public List<Question> AvailableQuestions { get; set; } = new();
}
