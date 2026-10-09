using System.Net;
using System.Text;
using System.Text.Json;
using Aiursoft.MusicTools.Entities;
using Aiursoft.MusicTools.Services.FileStorage;
using Aiursoft.MusicTools.Services.Listening;
using Aiursoft.MusicTools.Tests.IntegrationTests;
using Microsoft.EntityFrameworkCore;

namespace Aiursoft.MusicTools.Tests.Listening;

[TestClass]
public class ListeningControllerTests : TestBase
{
    private readonly List<int> createdScores = [];

    [TestCleanup]
    public override async Task CleanServer()
    {
        if (Server != null)
        {
            using var scope = Server.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<MusicToolsDbContext>();
            var questions = await context.Questions.Include(q => q.Options).Where(q => createdScores.Contains(q.ScoreId)).ToListAsync();
            context.Questions.RemoveRange(questions);
            context.Scores.RemoveRange(await context.Scores.Where(s => createdScores.Contains(s.Id)).ToListAsync());
            await context.SaveChangesAsync();
        }
        await base.CleanServer();
    }

    private async Task<Question> SeedQuestion(QuestionStatus status)
    {
        using var scope = Server!.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<MusicToolsDbContext>();
        var storage = scope.ServiceProvider.GetRequiredService<StorageService>();
        var score = new Score { Name = "Private original", FilePath = "score/private.musicxml", IsPrivate = true };
        var question = new Question { Title = status == QuestionStatus.Published ? "Published challenge" : "Private draft", Score = score, ScoreId = 0,
            Status = status, IsFocused = true, OptionCount = 3, Prompt = "Compare the first note.",
            Explanation = "Listen to the pitch of the first note." };
        for (var i = 0; i < 3; i++)
        {
            using var xml = new MemoryStream(Encoding.UTF8.GetBytes($"<score-partwise><part-list/><part id=\"P1\"><measure number=\"1\"><note><pitch><step>C</step><octave>{i + 1}</octave></pitch><duration>4</duration></note></measure></part></score-partwise>"));
            using var audio = new MemoryStream(MusicXmlPlayback.Serialize(MusicXmlScore.Parse(Encoding.UTF8.GetString(xml.ToArray()))));
            question.Options.Add(new QuestionOption
            {
                MusicXmlPath = await storage.SaveFromStream($"listening/{Guid.NewGuid():N}.musicxml", xml, true),
                AudioPath = await storage.SaveFromStream($"listening/{Guid.NewGuid():N}.json", audio, true),
                IsCorrect = i == 0
            });
        }
        context.Questions.Add(question);
        await context.SaveChangesAsync();
        createdScores.Add(score.Id);
        return question;
    }

    [TestMethod]
    public async Task AnonymousPracticeDoesNotLeakAnswerAndFirstSubmissionWins()
    {
        var question = await SeedQuestion(QuestionStatus.Published);
        var draft = await SeedQuestion(QuestionStatus.Draft);
        var html = await (await Http.GetAsync("/Dashboard/MelodyExcerptQuiz")).Content.ReadAsStringAsync();
        Assert.Contains("Published challenge", html);
        Assert.DoesNotContain("Private draft", html);
        Assert.DoesNotContain("The second note is higher", html);

        var response = await PostForm("/Listening/Start", new() { ["questionId"] = question.Id.ToString() }, "/Dashboard/MelodyExcerptQuiz");
        response.EnsureSuccessStatusCode();
        var text = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("IsCorrect", text);
        Assert.DoesNotContain("Explanation", text);
        Assert.DoesNotContain("MusicXmlPath", text);
        Assert.DoesNotContain("listening/", text);
        using var json = JsonDocument.Parse(text);
        var id = json.RootElement.GetProperty("AttemptId").GetString()!;
        var choices = json.RootElement.GetProperty("Choices").EnumerateArray().ToArray();
        Assert.HasCount(3, choices);
        Assert.HasCount(3, choices.Select(c => c.GetProperty("Key").GetString()).Distinct().ToArray());
        foreach (var choice in choices)
        {
            var notation = await Http.GetAsync(choice.GetProperty("XmlUrl").GetString());
            notation.EnsureSuccessStatusCode();
            Assert.AreEqual("application/vnd.recordare.musicxml+xml", notation.Content.Headers.ContentType?.MediaType);
            Assert.IsTrue(notation.Headers.CacheControl?.NoStore);
        }
        var audio = await Http.GetAsync(json.RootElement.GetProperty("AudioUrl").GetString());
        audio.EnsureSuccessStatusCode();
        Assert.AreEqual("application/json", audio.Content.Headers.ContentType?.MediaType);

        var submission = await PostForm("/Listening/Submit", new() { ["id"] = id, ["choice"] = choices[0].GetProperty("Key").GetString()! }, "/Dashboard/MelodyExcerptQuiz");
        submission.EnsureSuccessStatusCode();
        var answer = await submission.Content.ReadAsStringAsync();
        Assert.Contains("Listen to the pitch of the first note", answer);
        var second = await PostForm("/Listening/Submit", new() { ["id"] = id, ["choice"] = choices[1].GetProperty("Key").GetString()! }, "/Dashboard/MelodyExcerptQuiz");
        Assert.AreEqual(answer, await second.Content.ReadAsStringAsync());
        var draftStart = await PostForm("/Listening/Start", new() { ["questionId"] = draft.Id.ToString() }, "/Dashboard/MelodyExcerptQuiz");
        Assert.AreEqual(HttpStatusCode.NotFound, draftStart.StatusCode);
        var forgedChoice = await Http.GetAsync($"/Listening/Notation/{id}?choice={Guid.NewGuid()}");
        Assert.AreEqual(HttpStatusCode.NotFound, forgedChoice.StatusCode);
    }

    [TestMethod]
    public async Task LegacyLongPassagesAreRetainedButNotOfferedAsFocusedPractice()
    {
        var question = await SeedQuestion(QuestionStatus.Published);
        using (var scope = Server!.Services.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<MusicToolsDbContext>();
            var tracked = await context.Questions.FindAsync(question.Id);
            tracked!.IsFocused = false;
            tracked.Title = "Legacy long passage";
            await context.SaveChangesAsync();
        }
        var response = await Http.GetAsync("/Dashboard/MelodyExcerptQuiz");
        Assert.DoesNotContain("Legacy long passage", await response.Content.ReadAsStringAsync());
        var start = await PostForm("/Listening/Start", new() { ["questionId"] = question.Id.ToString() }, "/Account/Login");
        Assert.AreEqual(HttpStatusCode.NotFound, start.StatusCode);
    }

    [TestMethod]
    public async Task WithdrawalInvalidatesExistingAttemptAndManagementAssetsRequirePermission()
    {
        var question = await SeedQuestion(QuestionStatus.Published);
        var start = await PostForm("/Listening/Start", new() { ["questionId"] = question.Id.ToString() }, "/Dashboard/MelodyExcerptQuiz");
        using var json = JsonDocument.Parse(await start.Content.ReadAsStringAsync());
        var audioUrl = json.RootElement.GetProperty("AudioUrl").GetString();
        using (var scope = Server!.Services.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<MusicToolsDbContext>();
            var tracked = await context.Questions.FindAsync(question.Id);
            tracked!.Status = QuestionStatus.Draft;
            tracked.Revision = Guid.NewGuid();
            await context.SaveChangesAsync();
        }
        Assert.AreEqual(HttpStatusCode.NotFound, (await Http.GetAsync(audioUrl)).StatusCode);
        foreach (var url in new[] { $"/QuestionManagement/ScoreXml/{question.ScoreId}", $"/QuestionManagement/OptionXml/{question.Options.First().Id}", $"/QuestionManagement/OptionAudio/{question.Options.First().Id}" })
            Assert.AreEqual(HttpStatusCode.Found, (await Http.GetAsync(url)).StatusCode);
        var privatePath = question.Options.First().MusicXmlPath;
        Assert.AreEqual(HttpStatusCode.NotFound, (await Http.GetAsync("/download/" + privatePath)).StatusCode);
        var noToken = await PostForm("/Listening/Start", new() { ["questionId"] = question.Id.ToString() }, includeToken: false);
        Assert.AreEqual(HttpStatusCode.BadRequest, noToken.StatusCode);
    }
}
