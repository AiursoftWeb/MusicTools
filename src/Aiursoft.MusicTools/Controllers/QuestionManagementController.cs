using Aiursoft.MusicTools.Authorization;
using Aiursoft.MusicTools.Entities;
using Aiursoft.MusicTools.Models.QuestionManagementViewModels;
using Aiursoft.MusicTools.Services;
using Aiursoft.MusicTools.Services.FileStorage;
using Aiursoft.MusicTools.Services.Listening;
using Aiursoft.UiStack.Navigation;
using Aiursoft.WebTools.Attributes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Aiursoft.MusicTools.Controllers;

[Authorize(Policy = AppPermissionNames.CanManageQuestions)]
[LimitPerMin]
public class QuestionManagementController(
    MusicToolsDbContext context,
    StorageService storageService,
    ListeningQuestionService listening,
    IScoreConverter converter) : Controller
{
    [RenderInNavBar(NavGroupName = "Administration", NavGroupOrder = 9999,
        CascadedLinksGroupName = "Question Bank", CascadedLinksIcon = "music-note-list", CascadedLinksOrder = 9997,
        LinkText = "Score Library", LinkOrder = 1)]
    public async Task<IActionResult> Index(string? search)
    {
        var query = context.Scores.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search)) query = query.Where(s => s.Name.Contains(search) || s.Author.Contains(search));
        return this.StackView(new ScoreLibraryViewModel { Scores = await query.OrderByDescending(s => s.UploadTime).ToListAsync() });
    }

    [RenderInNavBar(NavGroupName = "Administration", NavGroupOrder = 9999,
        CascadedLinksGroupName = "Question Bank", CascadedLinksIcon = "music-note-list", CascadedLinksOrder = 9997,
        LinkText = "Question Library", LinkOrder = 2)]
    public async Task<IActionResult> QuestionLibrary() => this.StackView(new QuestionLibraryViewModel
    {
        Questions = await context.Questions.AsNoTracking().Include(q => q.Score).OrderByDescending(q => q.CreateTime).ToListAsync()
    });

    public IActionResult UploadScore() => this.StackView(new UploadScoreViewModel());

    public IActionResult ExportMusicXml() => this.StackView(new ExportMusicXmlViewModel());

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> UploadScore(UploadScoreViewModel model)
    {
        if (!ModelState.IsValid) return this.StackView(model);
        string physicalPath;
        try
        {
            physicalPath = storageService.GetFilePhysicalPath(model.ScorePath!, isVault: true);
        }
        catch (ArgumentException)
        {
            return BadRequest();
        }
        var file = new FileInfo(physicalPath);
        if (file.Extension.Equals(".mscz", StringComparison.OrdinalIgnoreCase) ||
            file.Extension.Equals(".mscx", StringComparison.OrdinalIgnoreCase))
            return RedirectToAction(nameof(ExportMusicXml));
        if (!file.Exists || file.Length is <= 0 or > 20 * 1024 * 1024 ||
            !new[] { ".mxl", ".xml", ".musicxml" }.Contains(file.Extension.ToLowerInvariant()))
        {
            ModelState.AddModelError(nameof(model.ScorePath), "Upload a MusicXML file (.musicxml, .xml or .mxl), up to 20 MB.");
            return this.StackView(model);
        }
        var score = new Score
        {
            Name = model.Name.Trim(), Author = model.Author.Trim(), FilePath = model.ScorePath!,
            IsPrivate = true, ImportStatus = ScoreImportStatus.Processing
        };
        context.Scores.Add(score);
        await context.SaveChangesAsync();
        listening.QueueImport(score.Id);
        return RedirectToAction(nameof(PreviewScore), new { id = score.Id });
    }

    public async Task<IActionResult> PreviewScore(int id)
    {
        var score = await context.Scores.FindAsync(id);
        return score == null ? NotFound() : this.StackView(new ScorePreviewViewModel { Score = score });
    }

    [HttpGet]
    public async Task<IActionResult> ScoreXml(int id)
    {
        var score = await context.Scores.FindAsync(id);
        if (score == null) return NotFound();
        if (score.NormalizedPath == null) return Conflict("The score is not ready.");
        return Content(await listening.ReadXmlAsync(score.NormalizedPath), "application/vnd.recordare.musicxml+xml");
    }

    [HttpGet]
    public async Task<IActionResult> DownloadOriginal(int id)
    {
        var score = await context.Scores.FindAsync(id);
        if (score == null) return NotFound();
        return PhysicalFile(storageService.GetFilePhysicalPath(score.FilePath, score.IsPrivate),
            "application/octet-stream", Path.GetFileName(score.FilePath));
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> RetryImport(int id)
    {
        var score = await context.Scores.FindAsync(id);
        if (score == null) return NotFound();
        score.ImportStatus = ScoreImportStatus.Processing;
        score.ImportError = null;
        await context.SaveChangesAsync();
        listening.QueueImport(id);
        return RedirectToAction(nameof(PreviewScore), new { id });
    }

    public async Task<IActionResult> CreateQuestion(int scoreId)
    {
        var score = await context.Scores.FindAsync(scoreId);
        if (score == null) return NotFound();
        if (score.ImportStatus != ScoreImportStatus.Ready) return RedirectToAction(nameof(PreviewScore), new { id = scoreId });
        var music = await listening.ReadScoreAsync(scoreId);
        return this.StackView(new CreateQuestionViewModel
        {
            ScoreId = scoreId, ScoreName = score.Name, Parts = music.Parts, PartId = music.Parts[0].Id,
            MeasureCount = Math.Min(4, music.Parts[0].MeasureLabels.Count),
            FocusMeasureIndex = Math.Min(3, music.Parts[0].MeasureLabels.Count - 1),
            Staff = 1
        });
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> CreateQuestion(CreateQuestionViewModel model)
    {
        var score = await context.Scores.FindAsync(model.ScoreId);
        if (score == null) return NotFound();
        model.ScoreName = score.Name;
        try
        {
            model.Parts = (await listening.ReadScoreAsync(model.ScoreId)).Parts;
            if (ModelState.IsValid)
            {
                var question = await listening.CreateAsync(model.ScoreId, model.Title, model.PartId,
                    model.StartMeasureIndex, model.MeasureCount, model.Staff, model.Skill, model.Difficulty, model.Explanation,
                    model.FocusMeasureIndex, model.FocusNotePosition - 1, model.OptionCount, model.Prompt);
                return RedirectToAction(nameof(PreviewQuestion), new { id = question.Id });
            }
        }
        catch (InvalidDataException exception)
        {
            ModelState.AddModelError(string.Empty, exception.Message);
        }
        return this.StackView(model);
    }

    [HttpGet]
    public async Task<IActionResult> Excerpt(int scoreId, string partId, int start, int count, int? staff)
    {
        try
        {
            var score = await listening.ReadScoreAsync(scoreId);
            return Content(score.Excerpt(partId, start, count, staff).ToXml(), "application/vnd.recordare.musicxml+xml");
        }
        catch (InvalidDataException exception)
        {
            return BadRequest(exception.Message);
        }
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Audition(int scoreId, string partId, int start, int count, int? staff)
    {
        try
        {
            var score = await listening.ReadScoreAsync(scoreId);
            var audio = await converter.RenderAudioAsync(score.Excerpt(partId, start, count, staff), HttpContext.RequestAborted);
            return File(audio, "application/json");
        }
        catch (Exception exception) when (exception is InvalidDataException or InvalidOperationException)
        {
            return BadRequest(exception.Message);
        }
    }

    public async Task<IActionResult> PreviewQuestion(int id)
    {
        var question = await context.Questions.Include(q => q.Score).Include(q => q.Options).SingleOrDefaultAsync(q => q.Id == id);
        if (question == null) return NotFound();
        var pitches = new Dictionary<Guid, int>();
        if (question.IsFocused)
            foreach (var option in question.Options)
            {
                var score = MusicXmlScore.Parse(await listening.ReadXmlAsync(option.MusicXmlPath));
                pitches[option.Id] = MusicXmlScore.MidiPitch(FocusedVariants.Note(score, question.FocusNoteIndex).Element("pitch")!);
            }
        return this.StackView(new QuestionPreviewViewModel { Question = question, Pitches = pitches });
    }

    [HttpGet]
    public async Task<IActionResult> ContextXml(int id)
    {
        var question = await context.Questions.FindAsync(id);
        return question?.ContextMusicXmlPath == null ? NotFound() :
            Content(await listening.ReadXmlAsync(question.ContextMusicXmlPath), "application/vnd.recordare.musicxml+xml");
    }

    [HttpGet]
    public async Task<IActionResult> OptionXml(Guid id)
    {
        var option = await context.QuestionOptions.FindAsync(id);
        return option == null ? NotFound() : Content(await listening.ReadXmlAsync(option.MusicXmlPath), "application/vnd.recordare.musicxml+xml");
    }

    [HttpGet]
    public async Task<IActionResult> OptionAudio(Guid id)
    {
        var option = await context.QuestionOptions.FindAsync(id);
        return option?.AudioPath == null ? NotFound() : PhysicalFile(storageService.GetFilePhysicalPath(option.AudioPath, true),
            "application/json");
    }

    [HttpPost, ValidateAntiForgeryToken]
    public Task<IActionResult> ReplaceOption(int id, Guid optionId, Guid revision) =>
        ChangeQuestion(id, () => listening.ReplaceOptionAsync(id, optionId, revision));

    [HttpPost, ValidateAntiForgeryToken]
    public Task<IActionResult> EditOption(int id, Guid optionId, Guid revision, int? midi, string? rhythm) =>
        ChangeQuestion(id, () => listening.EditOptionAsync(id, optionId, revision, midi, rhythm));

    [HttpPost, ValidateAntiForgeryToken]
    public Task<IActionResult> Publish(int id, Guid revision, string explanation, bool reviewed) => ChangeQuestion(id, () =>
        reviewed ? listening.PublishAsync(id, revision, explanation) : throw new InvalidDataException("Confirm that every version is musically plausible and was auditioned in context."));

    [HttpPost, ValidateAntiForgeryToken]
    public Task<IActionResult> Withdraw(int id, Guid revision) => ChangeQuestion(id, () => listening.WithdrawAsync(id, revision));

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> RetryAudio(int id, Guid revision)
    {
        var question = await context.Questions.FindAsync(id);
        if (question == null) return NotFound();
        if (question.Revision != revision || question.Status == QuestionStatus.Published) return Conflict();
        question.Status = QuestionStatus.Processing;
        question.ProcessingError = null;
        await context.SaveChangesAsync();
        listening.QueueAudio(id, revision);
        return RedirectToAction(nameof(PreviewQuestion), new { id });
    }

    private async Task<IActionResult> ChangeQuestion(int id, Func<Task> action)
    {
        try
        {
            await action();
        }
        catch (InvalidDataException exception)
        {
            TempData["ListeningError"] = exception.Message;
        }
        catch (DbUpdateConcurrencyException)
        {
            TempData["ListeningError"] = "This question changed. Reload the page before continuing.";
        }
        return RedirectToAction(nameof(PreviewQuestion), new { id });
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> DeleteScore(int id)
    {
        var score = await context.Scores.FindAsync(id);
        if (score == null) return NotFound();
        if (await context.Questions.AnyAsync(q => q.ScoreId == id))
        {
            TempData["ListeningError"] = "This score is used by questions. Remove those questions first.";
            return RedirectToAction(nameof(Index));
        }
        context.Scores.Remove(score);
        await context.SaveChangesAsync();
        return RedirectToAction(nameof(Index));
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> DeleteQuestion(int id)
    {
        var question = await context.Questions.FindAsync(id);
        if (question == null) return NotFound();
        if (question.Status == QuestionStatus.Published)
        {
            TempData["ListeningError"] = "Withdraw this question before deleting it.";
            return RedirectToAction(nameof(PreviewQuestion), new { id });
        }
        context.Questions.Remove(question);
        await context.SaveChangesAsync();
        return RedirectToAction(nameof(QuestionLibrary));
    }
}
