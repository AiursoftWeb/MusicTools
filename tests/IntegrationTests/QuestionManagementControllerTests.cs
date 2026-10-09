using System.Net;
using Aiursoft.MusicTools.Services.FileStorage;
using Aiursoft.MusicTools.Entities;
using Microsoft.EntityFrameworkCore;

namespace Aiursoft.MusicTools.Tests.IntegrationTests;

[TestClass]
public class QuestionManagementControllerTests : TestBase
{
    [TestMethod]
    public async Task MuseScoreUploadShowsExportGuideWithoutCreatingScore()
    {
        await LoginAsAdmin();
        var guide = await Http.GetAsync("/QuestionManagement/ExportMusicXml");
        guide.EnsureSuccessStatusCode();
        var html = await guide.Content.ReadAsStringAsync();
        Assert.Contains("MusicXML", html);
        Assert.Contains("Renaming .mscz", html);
        var storage = GetService<StorageService>();
        var context = GetService<MusicToolsDbContext>();
        foreach (var extension in new[] { ".mscz", ".mscx" })
        {
            using var stream = new MemoryStream([1, 2, 3]);
            var path = await storage.SaveFromStream($"score/{Guid.NewGuid():N}{extension}", stream, true);
            var response = await PostForm("/QuestionManagement/UploadScore", new Dictionary<string, string>
            {
                ["Name"] = "Export first", ["ScorePath"] = path
            });
            AssertRedirect(response, "/QuestionManagement/ExportMusicXml");
            Assert.IsFalse(await context.Scores.AnyAsync(s => s.FilePath == path));
        }
    }

    [TestMethod]
    public async Task TestQuestionManagementWorkflow()
    {
        await LoginAsAdmin();

        // 1. Index (Score Library)
        var indexResponse = await Http.GetAsync("/QuestionManagement");
        indexResponse.EnsureSuccessStatusCode();
        var indexHtml = await indexResponse.Content.ReadAsStringAsync();
        Assert.Contains("Score Library", indexHtml);

        // 2. Upload Score
        // We need to simulate a file existing for the StorageService check.
        var storage = GetService<StorageService>();
        var logicalPath = $"score/test-integration-{Guid.NewGuid():N}.xml";
        var physicalPath = storage.GetFilePhysicalPath(logicalPath, isVault: true);
        Directory.CreateDirectory(Path.GetDirectoryName(physicalPath)!);
        var validMusicXml = @"<?xml version=""1.0"" encoding=""UTF-8""?>
        <!DOCTYPE score-partwise PUBLIC ""-//Recordare//DTD MusicXML 3.1 Partwise//EN"" ""http://www.musicxml.org/dtds/partwise.dtd"">
        <score-partwise version=""3.1"">
          <part-list><score-part id=""P1""><part-name>Test</part-name></score-part></part-list>
          <part id=""P1"">
            <measure number=""1""><note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note></measure>
            <measure number=""2""><note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note></measure>
            <measure number=""3""><note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note></measure>
            <measure number=""4""><note><pitch><step>F</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note></measure>
          </part>
        </score-partwise>";
        await File.WriteAllTextAsync(physicalPath, validMusicXml);

        var uploadResponse = await PostForm("/QuestionManagement/UploadScore", new Dictionary<string, string>
        {
            { "Name", "Test Score 1" },
            { "ScorePath", logicalPath }
        });
        AssertRedirect(uploadResponse, "/QuestionManagement/PreviewScore", exact: false);

        var database = GetService<MusicToolsDbContext>();
        Score? imported = null;
        for (var attempt = 0; attempt < 100; attempt++)
        {
            imported = await database.Scores.AsNoTracking().SingleAsync(s => s.FilePath == logicalPath);
            if (imported.ImportStatus != ScoreImportStatus.Processing) break;
            await Task.Delay(100);
        }
        Assert.AreEqual(ScoreImportStatus.Ready, imported?.ImportStatus, imported?.ImportError);

        // 3. Verify Score in Index
        indexResponse = await Http.GetAsync("/QuestionManagement");
        indexHtml = await indexResponse.Content.ReadAsStringAsync();
        Assert.Contains("Test Score 1", indexHtml);

        // Get the score ID from the HTML (it should be in the CreateQuestion link)
        // Match: href="/QuestionManagement/CreateQuestion?scoreId=1"
        var scoreId = imported!.Id.ToString();
        Assert.Contains($"scoreId={scoreId}", indexHtml);

        // 4. Create Question (GET)
        var createQuestionPageResponse = await Http.GetAsync($"/QuestionManagement/CreateQuestion?scoreId={scoreId}");
        createQuestionPageResponse.EnsureSuccessStatusCode();
        var createQuestionHtml = await createQuestionPageResponse.Content.ReadAsStringAsync();
        Assert.Contains("Create Question", createQuestionHtml);
        Assert.Contains("Test Score 1", createQuestionHtml);

        // 5. Create Question (POST)
        var createQuestionResponse = await PostForm("/QuestionManagement/CreateQuestion", new Dictionary<string, string>
        {
            { "ScoreId", scoreId },
            { "Title", "Test Question 1" },
            { "StartMeasureIndex", "0" },
            { "MeasureCount", "4" }
        });
        AssertRedirect(createQuestionResponse, "/QuestionManagement/PreviewQuestion", exact: false);

        // 6. Verify Question in Library
        var libraryResponse = await Http.GetAsync("/QuestionManagement/QuestionLibrary");
        libraryResponse.EnsureSuccessStatusCode();
        var libraryHtml = await libraryResponse.Content.ReadAsStringAsync();
        Assert.Contains("Test Question 1", libraryHtml);
        Assert.Contains("Test Score 1", libraryHtml);

        // 7. Delete Question
        var questionId = (await database.Questions.AsNoTracking().SingleAsync(q => q.ScoreId == imported.Id)).Id.ToString();

        var deleteQuestionResponse = await PostForm($"/QuestionManagement/DeleteQuestion/{questionId}", new Dictionary<string, string>
        {
            { "id", questionId }
        });
        AssertRedirect(deleteQuestionResponse, "/QuestionManagement/QuestionLibrary");

        // 8. Delete Score
        var deleteScoreResponse = await PostForm($"/QuestionManagement/DeleteScore/{scoreId}", new Dictionary<string, string>
        {
            { "id", scoreId }
        });
        AssertRedirect(deleteScoreResponse, "/QuestionManagement");
    }

    [TestMethod]
    public async Task TestUnauthorizedAccess()
    {
        // Try accessing management without logging in
        var response = await Http.GetAsync("/QuestionManagement");
        Assert.AreEqual(HttpStatusCode.Found, response.StatusCode); // Redirects to login
        Assert.Contains("/Account/Login", response.Headers.Location?.OriginalString ?? "");

        // Login as a normal user (not admin, so no management permission)
        await RegisterAndLoginAsync();
        response = await Http.GetAsync("/QuestionManagement");
        // Should be forbidden or redirect if standard template handling is used
        // Usually [Authorize(Policy=...)] returns 403 or redirects to access denied.
        Assert.IsTrue(response.StatusCode == HttpStatusCode.Forbidden || response.StatusCode == HttpStatusCode.Found);
    }
}
