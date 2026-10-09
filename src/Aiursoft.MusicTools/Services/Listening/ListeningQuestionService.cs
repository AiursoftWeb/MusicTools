using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Aiursoft.Canon.TaskQueue;
using Aiursoft.MusicTools.Entities;
using Aiursoft.MusicTools.Services.FileStorage;
using Aiursoft.Scanner.Abstractions;
using Microsoft.EntityFrameworkCore;

namespace Aiursoft.MusicTools.Services.Listening;

public class ListeningQuestionService(
    MusicToolsDbContext context,
    StorageService storage,
    IScoreConverter converter,
    ServiceTaskQueue queue,
    ILogger<ListeningQuestionService> logger) : IScopedDependency
{
    public void QueueImport(int scoreId) => queue.QueueWithDependency<ListeningQuestionService>(
        "Listening assets", $"Import score {scoreId}", service => service.ImportAsync(scoreId));

    public async Task ImportAsync(int scoreId)
    {
        var score = await context.Scores.FindAsync(scoreId);
        if (score == null) return;
        try
        {
            score.ImportStatus = ScoreImportStatus.Processing;
            score.ImportError = null;
            await context.SaveChangesAsync();
            var music = await converter.ImportAsync(storage.GetFilePhysicalPath(score.FilePath, score.IsPrivate));
            score.NormalizedPath = await SaveXmlAsync(music.ToXml());
            score.ImportStatus = ScoreImportStatus.Ready;
            await context.SaveChangesAsync();
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Score {ScoreId} import failed", scoreId);
            score.ImportStatus = ScoreImportStatus.Failed;
            score.ImportError = DisplayError(exception);
            await context.SaveChangesAsync();
            throw;
        }
    }

    public async Task<MusicXmlScore> ReadScoreAsync(int scoreId)
    {
        var score = await context.Scores.FindAsync(scoreId) ?? throw new InvalidDataException("Score not found.");
        if (score.ImportStatus != ScoreImportStatus.Ready || score.NormalizedPath == null)
            throw new InvalidDataException("Import the score successfully before creating a question.");
        return MusicXmlScore.Parse(await ReadXmlAsync(score.NormalizedPath));
    }

    public async Task<Question> CreateAsync(int scoreId, string title, string partId, int start, int count,
        int? staff, ListeningSkill skill, int difficulty, string explanation,
        int? focusMeasureIndex = null, int focusNoteIndex = 0, int optionCount = 3,
        string prompt = "Listen to the target measure. Which version matches what you hear?")
    {
        if (string.IsNullOrWhiteSpace(title) || title.Length > 100 || partId.Length > 100 ||
            difficulty is < 1 or > 3 || explanation.Length > 4000 || prompt.Length > 1000 ||
            string.IsNullOrWhiteSpace(prompt) || optionCount is < 3 or > 4 ||
            skill is not (ListeningSkill.Pitch or ListeningSkill.Rhythm))
            throw new InvalidDataException("Check the question title, difficulty and explanation.");
        var score = await ReadScoreAsync(scoreId);
        var contextScore = score.Excerpt(partId, start, count, staff);
        var focus = focusMeasureIndex ?? start + count - 1;
        if (focus < start || focus >= start + count)
            throw new InvalidDataException("The target measure must be inside the listening context.");
        var excerpt = contextScore.Excerpt(partId, focus - start, 1);
        var candidates = FocusedVariants.Generate(excerpt, skill, focusNoteIndex, optionCount - 1);
        var question = new Question
        {
            ScoreId = scoreId, Title = title.Trim(), PartId = partId, StartMeasureIndex = start,
            MeasureCount = count, Staff = staff, Skill = skill, Difficulty = difficulty,
            Explanation = explanation.Trim(), Status = QuestionStatus.Processing,
            IsFocused = true, FocusMeasureIndex = focus, FocusNoteIndex = focusNoteIndex,
            OptionCount = optionCount, Prompt = prompt.Trim(),
            ContextMusicXmlPath = await SaveXmlAsync(contextScore.ToXml())
        };
        question.Options.Add(new QuestionOption
        {
            IsCorrect = true, MusicXmlPath = await SaveXmlAsync(excerpt.ToXml()),
            Explanation = "This version retains the source measure's pitch and rhythm."
        });
        foreach (var candidate in candidates)
        {
            question.Options.Add(new QuestionOption
            {
                MusicXmlPath = await SaveXmlAsync(candidate.MusicXml), Explanation = candidate.Explanation
            });
        }
        context.Questions.Add(question);
        await context.SaveChangesAsync();
        QueueAudio(question.Id, question.Revision);
        return question;
    }

    public void QueueAudio(int questionId, Guid revision) => queue.QueueWithDependency<ListeningQuestionService>(
        "Listening assets", $"Render question {questionId}", service => service.RenderAudioAsync(questionId, revision));

    public async Task RenderAudioAsync(int questionId, Guid revision)
    {
        var question = await context.Questions.Include(q => q.Options).SingleOrDefaultAsync(q => q.Id == questionId);
        if (question == null || question.Revision != revision || question.Status == QuestionStatus.Published) return;
        try
        {
            foreach (var option in question.Options.Where(o => o.AudioPath == null))
            {
                var xml = MusicXmlScore.Parse(await ReadXmlAsync(option.MusicXmlPath));
                var audio = await converter.RenderAudioAsync(xml);
                if (question.IsFocused && question.ContextMusicXmlPath != null)
                {
                    var contextScore = MusicXmlScore.Parse(await ReadXmlAsync(question.ContextMusicXmlPath));
                    var offset = question.FocusMeasureIndex - question.StartMeasureIndex;
                    var revised = contextScore.ReplaceMeasure(offset, xml);
                    audio = await converter.RenderAudioAsync(revised);
                    var data = JsonNode.Parse(audio) ?? throw new InvalidDataException("Playback data is missing.");
                    data["focusStart"] = offset == 0 ? 0 : Duration(revised.Excerpt(revised.Parts[0].Id, 0, offset));
                    data["focusEnd"] = Duration(revised.Excerpt(revised.Parts[0].Id, 0, offset + 1));
                    audio = JsonSerializer.SerializeToUtf8Bytes(data);
                }
                using var stream = new MemoryStream(audio);
                option.AudioPath = await storage.SaveFromStream($"listening/{Guid.NewGuid():N}.json", stream, isVault: true);
            }
            question.Status = QuestionStatus.Draft;
            question.ProcessingError = null;
            await context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            logger.LogInformation("Question {QuestionId} changed while audio was rendering; ignoring obsolete results", questionId);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Question {QuestionId} audio rendering failed", questionId);
            question.Status = QuestionStatus.Failed;
            question.ProcessingError = DisplayError(exception);
            try
            {
                await context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                logger.LogInformation("Question {QuestionId} was changed or removed during conversion", questionId);
            }
            throw;
        }
    }

    public async Task ReplaceOptionAsync(int questionId, Guid optionId, Guid revision)
    {
        var question = await GetEditableAsync(questionId, revision);
        var option = question.Options.SingleOrDefault(o => o.Id == optionId && !o.IsCorrect)
                     ?? throw new InvalidDataException("Only a distractor can be replaced.");
        if (!question.IsFocused || question.ContextMusicXmlPath == null)
            throw new InvalidDataException("Recreate this legacy question as a focused listening exercise.");
        var source = MusicXmlScore.Parse(await ReadXmlAsync(question.ContextMusicXmlPath));
        var excerpt = source.Excerpt(source.Parts[0].Id, question.FocusMeasureIndex - question.StartMeasureIndex, 1);
        var excluded = new List<string>();
        foreach (var existing in question.Options) excluded.Add(await ReadXmlAsync(existing.MusicXmlPath));
        var candidate = FocusedVariants.Generate(excerpt, question.Skill, question.FocusNoteIndex, 1, excluded)[0];
        context.QuestionOptions.Remove(option);
        question.Options.Remove(option);
        var replacement = new QuestionOption
        {
            QuestionId = question.Id,
            MusicXmlPath = await SaveXmlAsync(candidate.MusicXml), Explanation = candidate.Explanation
        };
        context.QuestionOptions.Add(replacement);
        question.Revision = Guid.NewGuid();
        question.Status = QuestionStatus.Processing;
        question.ProcessingError = null;
        await context.SaveChangesAsync();
        QueueAudio(question.Id, question.Revision);
    }

    public async Task PublishAsync(int questionId, Guid revision, string explanation)
    {
        var question = await GetEditableAsync(questionId, revision);
        if (string.IsNullOrWhiteSpace(explanation) || explanation.Length > 4000)
            throw new InvalidDataException("Provide an explanation for students before publishing (up to 4000 characters).");
        if (!question.IsFocused || question.ContextMusicXmlPath == null || question.OptionCount is < 3 or > 4 ||
            question.Options.Count != question.OptionCount || question.Options.Count(o => o.IsCorrect) != 1 ||
            question.Options.Any(o => o.AudioPath == null ||
                                      !File.Exists(storage.GetFilePhysicalPath(o.AudioPath, true)) ||
                                      !File.Exists(storage.GetFilePhysicalPath(o.MusicXmlPath, true))))
            throw new InvalidDataException("All focused versions and their context audio must be ready before publishing.");
        var signatures = new HashSet<string>();
        foreach (var option in question.Options)
        {
            var music = MusicXmlScore.Parse(await ReadXmlAsync(option.MusicXmlPath));
            if (music.Parts[0].MeasureLabels.Count != 1 || !signatures.Add(FocusedVariants.Fingerprint(music)))
                throw new InvalidDataException("Publish distinct one-measure versions, not duplicate choices.");
        }
        question.Explanation = explanation.Trim();
        question.Status = QuestionStatus.Published;
        question.Revision = Guid.NewGuid();
        await context.SaveChangesAsync();
    }

    public async Task WithdrawAsync(int questionId, Guid revision)
    {
        var question = await context.Questions.FindAsync(questionId) ?? throw new InvalidDataException("Question not found.");
        if (question.Revision != revision) throw new InvalidDataException("This question changed. Reload the page before continuing.");
        if (question.Status != QuestionStatus.Published) throw new InvalidDataException("Only a published question can be withdrawn.");
        question.Status = QuestionStatus.Draft;
        question.Revision = Guid.NewGuid();
        await context.SaveChangesAsync();
    }

    private async Task<Question> GetEditableAsync(int questionId, Guid revision)
    {
        var question = await context.Questions.Include(q => q.Options).SingleOrDefaultAsync(q => q.Id == questionId)
                       ?? throw new InvalidDataException("Question not found.");
        if (question.Revision != revision) throw new InvalidDataException("This question changed. Reload the page before continuing.");
        if (question.Status is QuestionStatus.Published or QuestionStatus.Processing)
            throw new InvalidDataException("Wait for processing to finish, or withdraw the published question before editing.");
        return question;
    }

    public async Task EditOptionAsync(int questionId, Guid optionId, Guid revision, int? midi, string? rhythm)
    {
        var question = await GetEditableAsync(questionId, revision);
        if (!question.IsFocused) throw new InvalidDataException("Recreate this legacy question first.");
        var option = question.Options.SingleOrDefault(o => o.Id == optionId)
            ?? throw new InvalidDataException("Version not found.");
        var music = MusicXmlScore.Parse(await ReadXmlAsync(option.MusicXmlPath));
        var edit = FocusedVariants.Edit(music, question.Skill, question.FocusNoteIndex, midi, rhythm);
        var signature = FocusedVariants.Fingerprint(MusicXmlScore.Parse(edit.MusicXml));
        foreach (var other in question.Options.Where(o => o.Id != optionId))
            if (signature == FocusedVariants.Fingerprint(MusicXmlScore.Parse(await ReadXmlAsync(other.MusicXmlPath))))
                throw new InvalidDataException("That would duplicate another version. Choose a distinct pitch or rhythm.");
        option.MusicXmlPath = await SaveXmlAsync(edit.MusicXml);
        option.AudioPath = null;
        option.Explanation = edit.Explanation;
        question.Revision = Guid.NewGuid();
        question.Status = QuestionStatus.Processing;
        await context.SaveChangesAsync();
        QueueAudio(question.Id, question.Revision);
    }

    private static double Duration(MusicXmlScore score)
    {
        using var data = JsonDocument.Parse(MusicXmlPlayback.Serialize(score, allowSilence: true));
        return data.RootElement.GetProperty("duration").GetDouble();
    }

    public async Task<string> ReadXmlAsync(string path) => await File.ReadAllTextAsync(storage.GetFilePhysicalPath(path, true));

    private async Task<string> SaveXmlAsync(string xml)
    {
        using var stream = new MemoryStream(Encoding.UTF8.GetBytes(xml));
        return await storage.SaveFromStream($"listening/{Guid.NewGuid():N}.musicxml", stream, isVault: true);
    }

    private static string DisplayError(Exception exception) => exception is InvalidDataException or InvalidOperationException
        ? exception.Message[..Math.Min(exception.Message.Length, 2000)]
        : "Processing failed. Check the server logs and retry.";
}
