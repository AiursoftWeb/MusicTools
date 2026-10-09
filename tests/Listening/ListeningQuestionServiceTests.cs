using Aiursoft.Canon.TaskQueue;
using Aiursoft.MusicTools.Entities;
using Aiursoft.MusicTools.Services.FileStorage;
using Aiursoft.MusicTools.Services.Listening;
using Aiursoft.MusicTools.Tests.IntegrationTests;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace Aiursoft.MusicTools.Tests.Listening;

[TestClass]
public class ListeningQuestionServiceTests : TestBase
{
    private readonly List<int> createdScores = [];

    [TestCleanup]
    public override async Task CleanServer()
    {
        if (Server != null)
        {
            using var scope = Server.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<MusicToolsDbContext>();
            context.Questions.RemoveRange(await context.Questions.Include(q => q.Options)
                .Where(q => createdScores.Contains(q.ScoreId)).ToListAsync());
            context.Scores.RemoveRange(await context.Scores.Where(s => createdScores.Contains(s.Id)).ToListAsync());
            await context.SaveChangesAsync();
        }
        await base.CleanServer();
    }

    private const string Xml = "<score-partwise><part-list><score-part id=\"P1\"><part-name>Piano</part-name></score-part></part-list><part id=\"P1\"><measure number=\"1\"><attributes><divisions>4</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes><note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note><note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note><note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note><note><pitch><step>F</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note></measure></part></score-partwise>";

    private ListeningQuestionService CreateService(MusicToolsDbContext context, bool failAudio = false) =>
        new(context, GetService<StorageService>(), new TestConverter(failAudio),
            new ServiceTaskQueue(), NullLogger<ListeningQuestionService>.Instance);

    private async Task<Score> AddScoreAsync(MusicToolsDbContext context, string? musicXml = null)
    {
        var storage = GetService<StorageService>();
        using var input = new MemoryStream(System.Text.Encoding.UTF8.GetBytes(musicXml ?? Xml));
        var path = await storage.SaveFromStream($"score/{Guid.NewGuid():N}.musicxml", input, isVault: true);
        var score = new Score { Name = "Workflow score", Author = "Test author", FilePath = path, IsPrivate = true };
        context.Scores.Add(score);
        await context.SaveChangesAsync();
        createdScores.Add(score.Id);
        return score;
    }

    [TestMethod]
    public async Task ImportCreateReviewReplacePublishAndWithdraw()
    {
        using var scope = Server!.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<MusicToolsDbContext>();
        var service = CreateService(context);
        var score = await AddScoreAsync(context);
        await service.ImportAsync(score.Id);
        Assert.AreEqual(ScoreImportStatus.Ready, score.ImportStatus);
        Assert.IsNull(score.ImportError);

        var question = await service.CreateAsync(score.Id, "Listen carefully", "P1", 0, 1, null,
            ListeningSkill.Pitch, 2, "Listen for the second note.");
        Assert.AreEqual(QuestionStatus.Processing, question.Status);
        Assert.HasCount(3, question.Options);
        Assert.AreEqual(1, question.Options.Count(o => o.IsCorrect));
        await Assert.ThrowsExactlyAsync<InvalidDataException>(() => service.PublishAsync(question.Id, question.Revision, "Explanation"));

        await service.RenderAudioAsync(question.Id, question.Revision);
        Assert.AreEqual(QuestionStatus.Draft, question.Status);
        Assert.IsTrue(question.Options.All(o => o.AudioPath != null));
        var correctPath = question.Options.Single(o => o.IsCorrect).MusicXmlPath;
        var correctBefore = await service.ReadXmlAsync(correctPath);
        var oldRevision = question.Revision;
        var oldOption = question.Options.First(o => !o.IsCorrect).Id;
        await service.ReplaceOptionAsync(question.Id, oldOption, question.Revision);
        await service.RenderAudioAsync(question.Id, question.Revision);
        Assert.AreNotEqual(oldRevision, question.Revision);
        Assert.HasCount(3, question.Options);
        Assert.IsFalse(question.Options.Any(o => o.Id == oldOption));
        Assert.AreEqual(correctBefore, await service.ReadXmlAsync(correctPath));
        await Assert.ThrowsExactlyAsync<InvalidDataException>(() => service.PublishAsync(question.Id, oldRevision, "Stale review"));
        await Assert.ThrowsExactlyAsync<InvalidDataException>(() => service.PublishAsync(question.Id, question.Revision, ""));
        await service.PublishAsync(question.Id, question.Revision, "The melody rises by step.");
        Assert.AreEqual(QuestionStatus.Published, question.Status);
        await Assert.ThrowsExactlyAsync<InvalidDataException>(() =>
            service.ReplaceOptionAsync(question.Id, question.Options.First(o => !o.IsCorrect).Id, question.Revision));
        await service.WithdrawAsync(question.Id, question.Revision);
        Assert.AreEqual(QuestionStatus.Draft, question.Status);
        Assert.AreEqual("The melody rises by step.", question.Explanation);
    }

    [TestMethod]
    public async Task ConversionFailureIsStoredAndCanBeRetried()
    {
        using var scope = Server!.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<MusicToolsDbContext>();
        var failing = CreateService(context, failAudio: true);
        var score = await AddScoreAsync(context);
        await failing.ImportAsync(score.Id);
        var question = await failing.CreateAsync(score.Id, "Retry test", "P1", 0, 1, null, ListeningSkill.Pitch, 1, "");
        await Assert.ThrowsExactlyAsync<InvalidOperationException>(() => failing.RenderAudioAsync(question.Id, question.Revision));
        Assert.AreEqual(QuestionStatus.Failed, question.Status);
        Assert.AreEqual("Test conversion failed.", question.ProcessingError);
        await CreateService(context).RenderAudioAsync(question.Id, question.Revision);
        Assert.AreEqual(QuestionStatus.Draft, question.Status);
        Assert.IsNull(question.ProcessingError);
    }

    [TestMethod]
    public async Task SourceChangesDoNotChangeQuestionSnapshotAndObsoleteJobsDoNothing()
    {
        using var scope = Server!.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<MusicToolsDbContext>();
        var service = CreateService(context);
        var score = await AddScoreAsync(context);
        await service.ImportAsync(score.Id);
        var question = await service.CreateAsync(score.Id, "Snapshot test", "P1", 0, 1, null, ListeningSkill.Pitch, 1, "");
        var path = question.Options.Single(o => o.IsCorrect).MusicXmlPath;
        var original = await service.ReadXmlAsync(path);
        var storage = GetService<StorageService>();
        await File.WriteAllTextAsync(storage.GetFilePhysicalPath(score.NormalizedPath!, true), Xml.Replace("<step>C</step>", "<step>G</step>"));
        Assert.AreEqual(original, await service.ReadXmlAsync(path));
        await service.RenderAudioAsync(question.Id, Guid.NewGuid());
        Assert.IsTrue(question.Options.All(o => o.AudioPath == null));
        Assert.AreEqual(3, await context.QuestionOptions.CountAsync(o => o.QuestionId == question.Id));
    }

    [TestMethod]
    public async Task ShortVersionsPlayInFrozenContextAndManualEditsRejectDuplicates()
    {
        using var scope = Server!.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<MusicToolsDbContext>();
        var document = System.Xml.Linq.XDocument.Parse(Xml);
        var part = document.Root!.Element("part")!;
        var measure = new System.Xml.Linq.XElement(part.Element("measure")!);
        part.ReplaceNodes(Enumerable.Range(1, 3).Select(i =>
        {
            var copy = new System.Xml.Linq.XElement(measure);
            copy.SetAttributeValue("number", i);
            return copy;
        }));
        var score = await AddScoreAsync(context, document.ToString());
        var service = CreateService(context);
        await service.ImportAsync(score.Id);
        var question = await service.CreateAsync(score.Id, "One note in context", "P1", 0, 3, null,
            ListeningSkill.Pitch, 1, "Listen to the first note in the middle measure.",
            focusMeasureIndex: 1, focusNoteIndex: 0, optionCount: 3);
        await service.RenderAudioAsync(question.Id, question.Revision);
        Assert.AreEqual(3, question.MeasureCount);
        Assert.AreEqual(1, question.FocusMeasureIndex);
        foreach (var option in question.Options)
        {
            Assert.HasCount(1, MusicXmlScore.Parse(await service.ReadXmlAsync(option.MusicXmlPath)).Parts[0].MeasureLabels);
            using var audio = System.Text.Json.JsonDocument.Parse(await service.ReadXmlAsync(option.AudioPath!));
            Assert.AreEqual(6d, audio.RootElement.GetProperty("duration").GetDouble());
            Assert.AreEqual(2d, audio.RootElement.GetProperty("focusStart").GetDouble());
            Assert.AreEqual(4d, audio.RootElement.GetProperty("focusEnd").GetDouble());
        }
        var edit = question.Options.First(o => !o.IsCorrect);
        await Assert.ThrowsExactlyAsync<InvalidDataException>(() =>
            service.EditOptionAsync(question.Id, edit.Id, question.Revision, 60, null));
        var previousRevision = question.Revision;
        await service.EditOptionAsync(question.Id, edit.Id, question.Revision, 67, null);
        Assert.AreNotEqual(previousRevision, question.Revision);
        await service.RenderAudioAsync(question.Id, question.Revision);
        await service.PublishAsync(question.Id, question.Revision, "Compare the marked note, not the whole passage.");
        await Assert.ThrowsExactlyAsync<InvalidDataException>(() =>
            service.EditOptionAsync(question.Id, edit.Id, question.Revision, 65, null));
        await Assert.ThrowsExactlyAsync<InvalidDataException>(() =>
            service.CreateAsync(score.Id, "Outside context", "P1", 0, 2, null, ListeningSkill.Pitch, 1, "", focusMeasureIndex: 2));
    }

    private sealed class TestConverter(bool failAudio) : IScoreConverter
    {
        public async Task<MusicXmlScore> ImportAsync(string path, CancellationToken cancellationToken = default) =>
            MusicXmlScore.Parse(await File.ReadAllTextAsync(path, cancellationToken));

        public Task<byte[]> RenderAudioAsync(MusicXmlScore score, CancellationToken cancellationToken = default) =>
            failAudio ? throw new InvalidOperationException("Test conversion failed.") : Task.FromResult(MusicXmlPlayback.Serialize(score));
    }
}
