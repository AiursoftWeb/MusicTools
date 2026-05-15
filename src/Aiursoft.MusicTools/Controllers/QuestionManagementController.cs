using Aiursoft.MusicTools.Authorization;
using Aiursoft.MusicTools.Entities;
using Aiursoft.MusicTools.Models.QuestionManagementViewModels;
using Aiursoft.MusicTools.Services;
using Aiursoft.MusicTools.Services.FileStorage;
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
    StorageService storageService) : Controller
{
    [RenderInNavBar(
        NavGroupName = "Administration",
        NavGroupOrder = 9999,
        CascadedLinksGroupName = "Question Bank",
        CascadedLinksIcon = "music-note-list",
        CascadedLinksOrder = 9997,
        LinkText = "Score Library",
        LinkOrder = 1)]
    public async Task<IActionResult> Index()
    {
        var scores = await context.Scores
            .OrderByDescending(s => s.UploadTime)
            .ToListAsync();

        return this.StackView(new ScoreLibraryViewModel
        {
            Scores = scores
        });
    }

    [RenderInNavBar(
        NavGroupName = "Administration",
        NavGroupOrder = 9999,
        CascadedLinksGroupName = "Question Bank",
        CascadedLinksIcon = "music-note-list",
        CascadedLinksOrder = 9997,
        LinkText = "Question Library",
        LinkOrder = 2)]
    public async Task<IActionResult> QuestionLibrary()
    {
        var questions = await context.Questions
            .Include(q => q.Score)
            .OrderByDescending(q => q.CreateTime)
            .ToListAsync();

        return this.StackView(new QuestionLibraryViewModel
        {
            Questions = questions
        });
    }

    public IActionResult UploadScore()
    {
        return this.StackView(new UploadScoreViewModel());
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> UploadScore(UploadScoreViewModel model)
    {
        if (!ModelState.IsValid)
        {
            return this.StackView(model);
        }

        try
        {
            var physicalPath = storageService.GetFilePhysicalPath(model.ScorePath!, isVault: false);
            if (!System.IO.File.Exists(physicalPath))
            {
                ModelState.AddModelError(nameof(model.ScorePath), "File upload failed or missing. Please re-upload.");
                return this.StackView(model);
            }
        }
        catch (ArgumentException)
        {
            return BadRequest();
        }

        var score = new Score
        {
            Name = model.Name,
            FilePath = model.ScorePath!,
            UploadTime = DateTime.UtcNow
        };

        context.Scores.Add(score);
        await context.SaveChangesAsync();

        return RedirectToAction(nameof(Index));
    }

    public async Task<IActionResult> CreateQuestion(int scoreId)
    {
        var score = await context.Scores.FindAsync(scoreId);
        if (score == null) return NotFound();

        return this.StackView(new CreateQuestionViewModel
        {
            ScoreId = scoreId,
            ScoreName = score.Name,
            ScorePath = score.FilePath
        });
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> CreateQuestion(CreateQuestionViewModel model)
    {
        if (!ModelState.IsValid)
        {
            return this.StackView(model);
        }

        var question = new Question
        {
            ScoreId = model.ScoreId,
            Title = model.Title,
            StartMeasureIndex = model.StartMeasureIndex,
            MeasureCount = model.MeasureCount,
            CreateTime = DateTime.UtcNow
        };

        context.Questions.Add(question);
        await context.SaveChangesAsync();

        return RedirectToAction(nameof(QuestionLibrary));
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> DeleteScore(int id)
    {
        var score = await context.Scores
            .Include(s => s.Questions)
            .FirstOrDefaultAsync(s => s.Id == id);
        if (score == null) return NotFound();

        context.Questions.RemoveRange(score.Questions);
        context.Scores.Remove(score);
        await context.SaveChangesAsync();

        return RedirectToAction(nameof(Index));
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> DeleteQuestion(int id)
    {
        var question = await context.Questions.FindAsync(id);
        if (question == null) return NotFound();

        context.Questions.Remove(question);
        await context.SaveChangesAsync();

        return RedirectToAction(nameof(QuestionLibrary));
    }
}
