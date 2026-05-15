using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Diagnostics.CodeAnalysis;
using Newtonsoft.Json;

namespace Aiursoft.MusicTools.Entities;

public class Score
{
    [Key]
    public int Id { get; init; }

    [Required]
    [MaxLength(100)]
    public required string Name { get; set; }

    [Required]
    [MaxLength(200)]
    public required string FilePath { get; set; }

    public DateTime UploadTime { get; init; } = DateTime.UtcNow;

    [InverseProperty(nameof(Question.Score))]
    public IEnumerable<Question> Questions { get; init; } = new List<Question>();
}
