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

    public DateTime CreateTime { get; init; } = DateTime.UtcNow;
}
