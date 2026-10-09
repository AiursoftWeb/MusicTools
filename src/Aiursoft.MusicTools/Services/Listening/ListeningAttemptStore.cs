using Aiursoft.MusicTools.Entities;
using Aiursoft.Scanner.Abstractions;
using Microsoft.Extensions.Caching.Memory;

namespace Aiursoft.MusicTools.Services.Listening;

/// <summary>Short-lived anonymous practice state. Multi-instance deployments need sticky sessions.</summary>
public sealed class ListeningAttemptStore : ISingletonDependency, IDisposable
{
    private readonly MemoryCache cache = new(new MemoryCacheOptions { SizeLimit = 512 });

    public ListeningAttempt Create(Question question)
    {
        if (!question.IsFocused || question.Status != QuestionStatus.Published ||
            question.OptionCount is < 3 or > 4 || question.Options.Count != question.OptionCount ||
            question.Options.Count(o => o.IsCorrect) != 1 || question.Options.Any(o => o.AudioPath == null))
            throw new InvalidDataException("This question is not ready for practice.");
        var versions = question.Options.ToArray();
        var selected = Random.Shared.Next(versions.Length);
        var choices = versions.Select((o, index) => new AttemptChoice(Guid.NewGuid(), o.MusicXmlPath, o.AudioPath!, index == selected)).ToArray();
        Random.Shared.Shuffle(choices);
        var attempt = new ListeningAttempt(Guid.NewGuid(), question.Id, question.Revision, choices,
            question.Explanation + (string.IsNullOrWhiteSpace(versions[selected].Explanation) ? "" : "\n" + versions[selected].Explanation));
        cache.Set(attempt.Id, attempt, new MemoryCacheEntryOptions { Size = 1, AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(30) });
        return attempt;
    }

    public ListeningAttempt? Find(Guid id) => cache.Get<ListeningAttempt>(id);

    public void Dispose() => cache.Dispose();
}

public sealed record AttemptChoice(Guid Key, string MusicXmlPath, string AudioPath, bool IsCorrect);

public sealed class ListeningAttempt(Guid id, int questionId, Guid revision, AttemptChoice[] choices, string explanation)
{
    public Guid Id { get; } = id;
    public int QuestionId { get; } = questionId;
    public Guid Revision { get; } = revision;
    public IReadOnlyList<AttemptChoice> Choices { get; } = choices;
    private readonly object gate = new();
    private AttemptResult? result;

    public AttemptResult Submit(Guid key)
    {
        lock (gate)
        {
            var choice = Choices.SingleOrDefault(c => c.Key == key) ?? throw new InvalidDataException("Choose one of the displayed versions.");
            return result ??= new AttemptResult(choice.IsCorrect, key, Choices.Single(c => c.IsCorrect).Key, explanation);
        }
    }
}

public sealed record AttemptResult(bool Correct, Guid SelectedChoice, Guid CorrectChoice, string Explanation);
