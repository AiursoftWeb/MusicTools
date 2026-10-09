using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

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

    [MaxLength(200)]
    public string Author { get; set; } = string.Empty;

    public bool IsPrivate { get; set; }

    [MaxLength(200)]
    public string? NormalizedPath { get; set; }

    public ScoreImportStatus ImportStatus { get; set; }

    [MaxLength(2000)]
    public string? ImportError { get; set; }

    public DateTime UploadTime { get; init; } = DateTime.UtcNow;

    [InverseProperty(nameof(Question.Score))]
    public IEnumerable<Question> Questions { get; init; } = new List<Question>();
}

public enum ScoreImportStatus
{
    Legacy,
    Processing,
    Ready,
    Failed
}
