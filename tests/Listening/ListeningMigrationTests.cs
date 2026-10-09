using Aiursoft.MusicTools.Entities;
using Aiursoft.MusicTools.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace Aiursoft.MusicTools.Tests.Listening;

[TestClass]
public class ListeningMigrationTests
{
    [TestMethod]
    public async Task SqliteUpgradePreservesLegacyQuestionsAndPreventsCascadingScoreDeletion()
    {
        await using var context = new SqliteContext(new DbContextOptionsBuilder<SqliteContext>()
            .UseSqlite("Data Source=:memory:").Options);
        await context.Database.OpenConnectionAsync();
        var migrator = context.GetService<IMigrator>();
        await migrator.MigrateAsync("20260514091521_AddScoreAndQuestion");
        await context.Database.ExecuteSqlRawAsync("INSERT INTO Scores (Id, Name, FilePath, UploadTime) VALUES (1, 'Legacy score', 'score/legacy.xml', '2026-01-01 00:00:00')");
        await context.Database.ExecuteSqlRawAsync("INSERT INTO Questions (Id, Title, ScoreId, StartMeasureIndex, MeasureCount, CreateTime) VALUES (1, 'Legacy question', 1, 0, 4, '2026-01-01 00:00:00')");
        await migrator.MigrateAsync();
        var score = await context.Scores.SingleAsync();
        var question = await context.Questions.SingleAsync();
        Assert.AreEqual("score/legacy.xml", score.FilePath);
        Assert.AreEqual(ScoreImportStatus.Legacy, score.ImportStatus);
        Assert.IsFalse(score.IsPrivate);
        Assert.AreEqual(QuestionStatus.Draft, question.Status);
        Assert.AreEqual(1, question.Difficulty);
        Assert.AreEqual("P1", question.PartId);
        Assert.AreEqual(4, question.MeasureCount);
        Assert.IsFalse(question.IsFocused);
        Assert.IsNull(question.ContextMusicXmlPath);
        Assert.IsFalse(context.Database.HasPendingModelChanges());
        context.ChangeTracker.Clear();
        context.Scores.Remove(await context.Scores.SingleAsync());
        await Assert.ThrowsExactlyAsync<DbUpdateException>(() => context.SaveChangesAsync());
    }
}
