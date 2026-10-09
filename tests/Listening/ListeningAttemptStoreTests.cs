using Aiursoft.MusicTools.Entities;
using Aiursoft.MusicTools.Services.Listening;

namespace Aiursoft.MusicTools.Tests.Listening;

[TestClass]
public class ListeningAttemptStoreTests
{
    private static Question Question() => new()
    {
        Title = "Practice", ScoreId = 1, IsFocused = true, OptionCount = 3,
        Status = QuestionStatus.Published, Explanation = "Compare the rhythm.",
        Options = Enumerable.Range(0, 3).Select(i => new QuestionOption
        {
            MusicXmlPath = $"{i}.musicxml", AudioPath = $"{i}.mp3", IsCorrect = i == 2
        }).ToList()
    };

    [TestMethod]
    public void FirstAnswerIsImmutableAndEachAttemptGetsFreshChoices()
    {
        using var store = new ListeningAttemptStore();
        var question = Question();
        var attempt = store.Create(question);
        var wrong = attempt.Choices.First(c => !c.IsCorrect);
        var correct = attempt.Choices.Single(c => c.IsCorrect);
        var result = attempt.Submit(wrong.Key);
        Assert.IsFalse(result.Correct);
        Assert.AreEqual(wrong.Key, result.SelectedChoice);
        Assert.AreEqual(correct.Key, result.CorrectChoice);
        Assert.AreEqual(question.Explanation, result.Explanation);
        Assert.AreSame(result, attempt.Submit(correct.Key));
        Assert.AreSame(attempt, store.Find(attempt.Id));
        var next = store.Create(question);
        Assert.IsFalse(next.Choices.Any(c => attempt.Choices.Any(first => first.Key == c.Key)));
        Assert.IsTrue(next.Submit(next.Choices.Single(c => c.IsCorrect).Key).Correct);
    }

    [TestMethod]
    public void RejectsDraftIncompleteAndForeignChoice()
    {
        using var store = new ListeningAttemptStore();
        var question = Question();
        var attempt = store.Create(question);
        Assert.ThrowsExactly<InvalidDataException>(() => attempt.Submit(Guid.NewGuid()));
        question.Status = QuestionStatus.Draft;
        AssertRejected(store, question);
        question.Status = QuestionStatus.Published;
        question.Options.First().AudioPath = null;
        AssertRejected(store, question);
    }

    [TestMethod]
    public void EveryReviewedVersionCanBePlayedNotJustTheSource()
    {
        using var store = new ListeningAttemptStore();
        var question = Question();
        var played = Enumerable.Range(0, 120).Select(_ =>
            store.Create(question).Choices.Single(c => c.IsCorrect).MusicXmlPath).ToHashSet();
        CollectionAssert.AreEquivalent(question.Options.Select(o => o.MusicXmlPath).ToArray(), played.ToArray());
        question.IsFocused = false;
        AssertRejected(store, question);
    }

    private static void AssertRejected(ListeningAttemptStore store, Question question) =>
        Assert.ThrowsExactly<InvalidDataException>(() => store.Create(question));
}
