using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Diagnostics.CodeAnalysis;
using Newtonsoft.Json;

namespace Aiursoft.MusicTools.Entities;

public class Question
{
    [Key]
    public int Id { get; init; }

    [Required]
    [MaxLength(100)]
    public required string Title { get; set; }

    public required int ScoreId { get; set; }

    [JsonIgnore]
    [ForeignKey(nameof(ScoreId))]
    [NotNull]
    public Score? Score { get; set; }

    public int StartMeasureIndex { get; set; }

    public int MeasureCount { get; set; } = 4;

    public bool IsFocused { get; set; }

    public int FocusMeasureIndex { get; set; }

    public int FocusNoteIndex { get; set; }

    public int OptionCount { get; set; } = 3;

    [MaxLength(1000)]
    public string Prompt { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? ContextMusicXmlPath { get; set; }

    [MaxLength(100)]
    public string PartId { get; set; } = "P1";

    public int? Staff { get; set; }

    public ListeningSkill Skill { get; set; }

    [Range(1, 3)]
    public int Difficulty { get; set; } = 1;

    [MaxLength(4000)]
    public string Explanation { get; set; } = string.Empty;

    public QuestionStatus Status { get; set; }

    [MaxLength(2000)]
    public string? ProcessingError { get; set; }

    [ConcurrencyCheck]
    public Guid Revision { get; set; } = Guid.NewGuid();

    [InverseProperty(nameof(QuestionOption.Question))]
    public ICollection<QuestionOption> Options { get; set; } = new List<QuestionOption>();

    public DateTime CreateTime { get; init; } = DateTime.UtcNow;
}

public enum QuestionStatus
{
    Draft,
    Processing,
    Published,
    Failed
}
