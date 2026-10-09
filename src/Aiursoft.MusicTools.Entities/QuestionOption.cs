using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Diagnostics.CodeAnalysis;
using Newtonsoft.Json;

namespace Aiursoft.MusicTools.Entities;

/// <summary>Reviewed, immutable musical assets. Do not serialize this entity to anonymous clients.</summary>
public class QuestionOption
{
    [Key]
    public Guid Id { get; init; } = Guid.NewGuid();

    public int QuestionId { get; set; }

    [ForeignKey(nameof(QuestionId))]
    [JsonIgnore]
    [NotNull]
    public Question? Question { get; set; }

    public bool IsCorrect { get; set; }

    [Required]
    [MaxLength(200)]
    public required string MusicXmlPath { get; set; }

    [MaxLength(200)]
    public string? AudioPath { get; set; }

    [MaxLength(1000)]
    public string Explanation { get; set; } = string.Empty;
}
