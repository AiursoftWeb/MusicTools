using System.ComponentModel.DataAnnotations;
using Aiursoft.UiStack.Layout;
using Aiursoft.MusicTools.Entities;
using Aiursoft.MusicTools.Services.Listening;

namespace Aiursoft.MusicTools.Models.QuestionManagementViewModels;

public class CreateQuestionViewModel : UiStackLayoutViewModel
{
    public CreateQuestionViewModel() => PageTitle = "Create Question";

    [Range(1, int.MaxValue)]
    public int ScoreId { get; set; }

    [Required]
    [MaxLength(100)]
    public string Title { get; set; } = string.Empty;

    [Range(0, int.MaxValue)]
    public int StartMeasureIndex { get; set; }

    [Range(1, 32)]
    public int MeasureCount { get; set; } = 4;

    [Range(0, int.MaxValue)]
    public int FocusMeasureIndex { get; set; }

    [Range(1, 128)]
    public int FocusNotePosition { get; set; } = 1;

    [Range(3, 4)]
    public int OptionCount { get; set; } = 3;

    [Required, MaxLength(1000)]
    public string Prompt { get; set; } = "Listen to the target measure. Which version matches what you hear?";

    [Required, MaxLength(100)]
    public string PartId { get; set; } = "P1";

    [Range(1, 16)]
    public int? Staff { get; set; }

    [EnumDataType(typeof(ListeningSkill))]
    public ListeningSkill Skill { get; set; }

    [Range(1, 3)]
    public int Difficulty { get; set; } = 1;

    [MaxLength(4000)]
    [DisplayFormat(ConvertEmptyStringToNull = false)]
    public string Explanation { get; set; } = string.Empty;

    public IReadOnlyList<ScorePartInfo> Parts { get; set; } = [];

    public string? ScoreName { get; set; }

}
