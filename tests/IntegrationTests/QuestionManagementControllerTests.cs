using System.Net;
using Aiursoft.MusicTools.Services.FileStorage;

namespace Aiursoft.MusicTools.Tests.IntegrationTests;

[TestClass]
public class QuestionManagementControllerTests : TestBase
{
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
        var logicalPath = "score/test-integration.mxl";
        var physicalPath = storage.GetFilePhysicalPath(logicalPath);
        Directory.CreateDirectory(Path.GetDirectoryName(physicalPath)!);
        await File.WriteAllTextAsync(physicalPath, "dummy musicxml content");

        var uploadResponse = await PostForm("/QuestionManagement/UploadScore", new Dictionary<string, string>
        {
            { "Name", "Test Score 1" },
            { "ScorePath", logicalPath }
        });
        AssertRedirect(uploadResponse, "/QuestionManagement");

        // 3. Verify Score in Index
        indexResponse = await Http.GetAsync("/QuestionManagement");
        indexHtml = await indexResponse.Content.ReadAsStringAsync();
        Assert.Contains("Test Score 1", indexHtml);

        // Get the score ID from the HTML (it should be in the CreateQuestion link)
        // Match: href="/QuestionManagement/CreateQuestion?scoreId=1"
        var scoreIdMatch = System.Text.RegularExpressions.Regex.Match(indexHtml, @"scoreId=(\d+)");
        Assert.IsTrue(scoreIdMatch.Success, "Could not find scoreId in Index HTML");
        var scoreId = scoreIdMatch.Groups[1].Value;

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
        AssertRedirect(createQuestionResponse, "/QuestionManagement/QuestionLibrary");

        // 6. Verify Question in Library
        var libraryResponse = await Http.GetAsync("/QuestionManagement/QuestionLibrary");
        libraryResponse.EnsureSuccessStatusCode();
        var libraryHtml = await libraryResponse.Content.ReadAsStringAsync();
        Assert.Contains("Test Question 1", libraryHtml);
        Assert.Contains("Test Score 1", libraryHtml);

        // 7. Delete Question
        var questionIdMatch = System.Text.RegularExpressions.Regex.Match(libraryHtml, @"DeleteQuestion/(\d+)");
        if (!questionIdMatch.Success)
        {
             questionIdMatch = System.Text.RegularExpressions.Regex.Match(libraryHtml, @"id=(\d+)");
        }
        Assert.IsTrue(questionIdMatch.Success, "Could not find questionId in Library HTML");
        var questionId = questionIdMatch.Groups[1].Value;

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
