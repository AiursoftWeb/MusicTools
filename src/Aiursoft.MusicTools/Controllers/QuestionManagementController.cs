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

        var physicalPath = "";
        try
        {
            physicalPath = storageService.GetFilePhysicalPath(model.ScorePath!, isVault: false);
        }
        catch (ArgumentException)
        {
            return BadRequest();
        }

        if (!System.IO.File.Exists(physicalPath))
        {
            ModelState.AddModelError(nameof(model.ScorePath), "File upload failed or missing. Please re-upload.");
            return this.StackView(model);
        }

        if (!IsValidMusicXml(physicalPath))
        {
            ModelState.AddModelError(nameof(model.ScorePath), "The file is not a valid MusicXML score. Please upload a proper MusicXML or MXL file.");
            return this.StackView(model);
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

    public async Task<IActionResult> PreviewScore(int id)
    {
        var score = await context.Scores.FindAsync(id);
        if (score == null) return NotFound();

        return this.StackView(new ScorePreviewViewModel
        {
            ScoreName = score.Name,
            ScorePath = score.FilePath
        });
    }

    public async Task<IActionResult> PreviewQuestion(int id)
    {
        var question = await context.Questions
            .Include(q => q.Score)
            .FirstOrDefaultAsync(q => q.Id == id);
        if (question == null) return NotFound();

        return this.StackView(new QuestionPreviewViewModel
        {
            Title = question.Title,
            ScoreName = question.Score.Name,
            ScorePath = question.Score.FilePath,
            StartMeasureIndex = question.StartMeasureIndex,
            MeasureCount = question.MeasureCount
        });
    }

    private static bool IsValidMusicXml(string physicalPath)
    {
        try
        {
            string xmlContent;
            if (physicalPath.EndsWith(".mxl", StringComparison.OrdinalIgnoreCase))
            {
                using var archive = System.IO.Compression.ZipFile.OpenRead(physicalPath);
                var xmlEntry = archive.Entries.FirstOrDefault(e =>
                    e.Name.EndsWith(".xml", StringComparison.OrdinalIgnoreCase) &&
                    !e.FullName.StartsWith("META-INF", StringComparison.OrdinalIgnoreCase));
                if (xmlEntry == null) return false;
                using var stream = xmlEntry.Open();
                using var reader = new System.IO.StreamReader(stream);
                xmlContent = reader.ReadToEnd();
            }
            else
            {
                xmlContent = System.IO.File.ReadAllText(physicalPath);
            }

            if (string.IsNullOrWhiteSpace(xmlContent)) return false;

            var doc = System.Xml.Linq.XDocument.Parse(xmlContent);
            var root = doc.Root;
            if (root == null) return false;

            var rootName = root.Name.LocalName;
            if (rootName != "score-partwise" && rootName != "score-timewise") return false;

            return root.Descendants().Any(e => e.Name.LocalName == "measure");
        }
        catch
        {
            return false;
        }
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
