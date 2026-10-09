using Aiursoft.MusicTools.Entities;
using Aiursoft.MusicTools.Services.FileStorage;
using Aiursoft.MusicTools.Services.Listening;
using Aiursoft.WebTools.Attributes;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Aiursoft.MusicTools.Controllers;

[LimitPerMin]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public class ListeningController(MusicToolsDbContext context, ListeningAttemptStore attempts, StorageService storage) : Controller
{
    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Start(int questionId)
    {
        var question = await context.Questions.AsNoTracking().Include(q => q.Options)
            .SingleOrDefaultAsync(q => q.Id == questionId && q.IsFocused && q.Status == QuestionStatus.Published);
        if (question == null) return NotFound();
        try
        {
            var attempt = attempts.Create(question);
            // An explicit projection is intentional: entity serialization would expose the answer and private paths.
            return Json(new
            {
                AttemptId = attempt.Id,
                question.Title,
                question.Prompt,
                FocusPosition = question.FocusMeasureIndex + 1,
                FocusNotePosition = question.FocusNoteIndex + 1,
                Choices = attempt.Choices.Select(c => new { c.Key, XmlUrl = Url.Action(nameof(Notation), new { id = attempt.Id, choice = c.Key }) }),
                AudioUrl = Url.Action(nameof(Audio), new { id = attempt.Id })
            });
        }
        catch (InvalidDataException exception)
        {
            return Conflict(exception.Message);
        }
    }

    [HttpGet]
    public async Task<IActionResult> Notation(Guid id, Guid choice)
    {
        var attempt = await ActiveAttempt(id);
        var option = attempt?.Choices.SingleOrDefault(c => c.Key == choice);
        if (option == null) return NotFound();
        return PhysicalFile(storage.GetFilePhysicalPath(option.MusicXmlPath, true), "application/vnd.recordare.musicxml+xml");
    }

    [HttpGet]
    public async Task<IActionResult> Audio(Guid id)
    {
        var attempt = await ActiveAttempt(id);
        if (attempt == null) return NotFound();
        return PhysicalFile(storage.GetFilePhysicalPath(attempt.Choices.Single(c => c.IsCorrect).AudioPath, true),
            "application/json");
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Submit(Guid id, Guid choice)
    {
        var attempt = await ActiveAttempt(id);
        if (attempt == null) return NotFound("This practice session expired or the question was withdrawn. Start again.");
        try
        {
            return Json(attempt.Submit(choice));
        }
        catch (InvalidDataException exception)
        {
            return BadRequest(exception.Message);
        }
    }

    private async Task<ListeningAttempt?> ActiveAttempt(Guid id)
    {
        var attempt = attempts.Find(id);
        return attempt != null && await context.Questions.AnyAsync(q => q.Id == attempt.QuestionId &&
            q.Revision == attempt.Revision && q.IsFocused && q.Status == QuestionStatus.Published) ? attempt : null;
    }
}
