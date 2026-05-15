using System.ComponentModel.DataAnnotations;
using Aiursoft.UiStack.Layout;

namespace Aiursoft.MusicTools.Models.QuestionManagementViewModels;

public class UploadScoreViewModel : UiStackLayoutViewModel
{
    public UploadScoreViewModel() => PageTitle = "Upload Score";

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [RegularExpression(@"^score/.*", ErrorMessage = "Invalid file path.")]
    public string? ScorePath { get; set; }
}
