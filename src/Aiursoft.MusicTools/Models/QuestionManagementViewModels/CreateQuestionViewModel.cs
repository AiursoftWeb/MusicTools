using System.ComponentModel.DataAnnotations;
using Aiursoft.UiStack.Layout;

namespace Aiursoft.MusicTools.Models.QuestionManagementViewModels;

public class CreateQuestionViewModel : UiStackLayoutViewModel
{
    public CreateQuestionViewModel() => PageTitle = "Create Question";

    [Required]
    public int ScoreId { get; set; }

    [Required]
    [MaxLength(100)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public int StartMeasureIndex { get; set; }

    [Required]
    public int MeasureCount { get; set; } = 4;

    public string? ScoreName { get; set; }

    public string? ScorePath { get; set; }
}
