using System.Globalization;
using System.Xml.Linq;
using Aiursoft.MusicTools.Entities;
using Aiursoft.Scanner.Abstractions;

namespace Aiursoft.MusicTools.Services.Listening;

/// <summary>
/// Generates review candidates, not published questions. Musical suitability still needs a musician's approval.
/// The caller persists the accepted XML; candidates are never regenerated during a student's attempt.
/// </summary>
public class DistractorGenerator : ITransientDependency
{
    public IReadOnlyList<DistractorCandidate> Generate(MusicXmlScore excerpt, ListeningSkill skill, int count = 5,
        IEnumerable<string>? excludedXml = null)
    {
        if (!Enum.IsDefined(skill) || count is < 1 or > 5) throw new ArgumentOutOfRangeException(nameof(skill));
        var seen = new HashSet<string> { Fingerprint(excerpt.CopyDocument()) };
        foreach (var xml in excludedXml ?? []) seen.Add(Fingerprint(MusicXmlScore.Parse(xml).CopyDocument()));
        var candidates = new List<DistractorCandidate>();
        var source = excerpt.CopyDocument();
        var changes = new List<(int Note, int Delta, bool Rhythm)>();
        var notes = source.Descendants("note").ToArray();
        for (var i = 0; i < notes.Length; i++)
        {
            if (skill != ListeningSkill.Rhythm && CanChange(notes[i]) && notes[i].Element("pitch") != null)
            {
                foreach (var delta in new[] { -2, -1, 1, 2, -3, 3 }) changes.Add((i, delta, false));
            }
            if (skill != ListeningSkill.Pitch && i + 1 < notes.Length && CanPair(notes[i], notes[i + 1]))
            {
                // Transfer duration between neighboring notes without moving any later onset.
                changes.Add((i, -1, true));
                changes.Add((i, 1, true));
            }
        }
        Random.Shared.Shuffle(System.Runtime.InteropServices.CollectionsMarshal.AsSpan(changes));
        foreach (var change in changes)
        {
            var copy = new XDocument(source);
            var copyNotes = copy.Descendants("note").ToArray();
            var note = copyNotes[change.Note];
            var changed = change.Rhythm
                ? ChangeRhythm(note, copyNotes[change.Note + 1], change.Delta)
                : ChangePitch(note, change.Delta);
            if (!changed) continue;
            if (skill == ListeningSkill.Mixed)
            {
                // A mixed candidate combines both skills, not just a randomly chosen single skill.
                // Try complementary edits on isolated copies so an unsupported rhythm edit cannot
                // partially mutate an otherwise valid candidate.
                XDocument? combined = null;
                foreach (var complement in changes.Where(c => c.Rhythm != change.Rhythm))
                {
                    var trial = new XDocument(copy);
                    var trialNotes = trial.Descendants("note").ToArray();
                    var applied = complement.Rhythm
                        ? ChangeRhythm(trialNotes[complement.Note], trialNotes[complement.Note + 1], complement.Delta)
                        : ChangePitch(trialNotes[complement.Note], complement.Delta);
                    if (!applied) continue;
                    combined = trial;
                    break;
                }
                if (combined == null) continue;
                copy = combined;
            }
            if (!seen.Add(Fingerprint(copy))) continue;
            var measure = note.Parent?.Attribute("number")?.Value ?? "?";
            var description = skill == ListeningSkill.Mixed
                ? "Change one pitch and redistribute two adjacent note durations; total duration is unchanged."
                : change.Rhythm
                ? $"Measure {measure}: redistribute the durations of two adjacent notes; total duration is unchanged."
                : $"Measure {measure}: change one pitch by {change.Delta:+0;-0} semitone(s); rhythm is unchanged.";
            candidates.Add(new DistractorCandidate(copy.ToString(SaveOptions.DisableFormatting), description));
            if (candidates.Count == count) return candidates;
        }
        throw new InvalidDataException("This passage cannot provide enough distinct distractors for this skill. Select a longer passage or a different skill.");
    }

    private static bool CanChange(XElement note) => note.Element("grace") == null && note.Element("chord") == null &&
        note.Element("tie") == null && note.Element("time-modification") == null &&
        note.Element("notations")?.Element("tied") == null &&
        note.ElementsAfterSelf().FirstOrDefault()?.Element("chord") == null;

    private static bool CanPair(XElement first, XElement second) => CanChange(first) && CanChange(second) &&
        first.Element("pitch") != null && second.Element("pitch") != null &&
        first.Parent == second.Parent && first.ElementsAfterSelf().FirstOrDefault() == second &&
        (first.Element("voice")?.Value ?? "1") == (second.Element("voice")?.Value ?? "1") &&
        (first.Element("staff")?.Value ?? "1") == (second.Element("staff")?.Value ?? "1");

    private static bool ChangePitch(XElement note, int delta)
    {
        var pitch = note.Element("pitch")!;
        var midi = MusicXmlScore.MidiPitch(pitch) + delta;
        if (midi is < 21 or > 108) return false;
        string[] steps = ["C", "C", "D", "D", "E", "F", "F", "G", "G", "A", "A", "B"];
        var sharp = midi % 12 is 1 or 3 or 6 or 8 or 10;
        pitch.ReplaceNodes(new XElement("step", steps[midi % 12]), new XElement("alter", sharp ? 1 : 0),
            new XElement("octave", midi / 12 - 1));
        note.Elements("accidental").Remove();
        var type = note.Element("type");
        if (type != null)
        {
            var lastDot = note.Elements("dot").LastOrDefault() ?? type;
            lastDot.AddAfterSelf(new XElement("accidental", sharp ? "sharp" : "natural"));
        }
        return true;
    }

    private static bool ChangeRhythm(XElement first, XElement second, int direction)
    {
        if (!decimal.TryParse(first.Element("duration")?.Value, CultureInfo.InvariantCulture, out var a) ||
            !decimal.TryParse(second.Element("duration")?.Value, CultureInfo.InvariantCulture, out var b) || a <= 0 || b <= 0)
            return false;
        var unitA = NoteLength(first);
        var unitB = NoteLength(second);
        if (unitA == null || unitB == null || a / unitA != b / unitB) return false;
        var delta = Math.Min(a, b) / 2 * direction;
        var newA = a + delta;
        var newB = b - delta;
        if (newA != decimal.Truncate(newA) || newB != decimal.Truncate(newB)) return false;
        if (!SetLength(first, unitA.Value * newA / a) || !SetLength(second, unitB.Value * newB / b)) return false;
        first.SetElementValue("duration", newA.ToString(CultureInfo.InvariantCulture));
        second.SetElementValue("duration", newB.ToString(CultureInfo.InvariantCulture));
        first.Elements("beam").Remove();
        second.Elements("beam").Remove();
        return true;
    }

    private static readonly (string Name, decimal Length)[] NoteTypes =
    [
        ("whole", 4), ("half", 2), ("quarter", 1), ("eighth", 0.5m), ("16th", 0.25m),
        ("32nd", 0.125m), ("64th", 0.0625m)
    ];

    private static decimal? NoteLength(XElement note)
    {
        var type = NoteTypes.FirstOrDefault(t => t.Name == note.Element("type")?.Value);
        var dots = note.Elements("dot").Count();
        return type.Length == 0 || dots > 1 ? null : type.Length * (dots == 1 ? 1.5m : 1);
    }

    private static bool SetLength(XElement note, decimal length)
    {
        foreach (var type in NoteTypes)
        {
            var dotted = type.Length * 1.5m == length;
            if (type.Length != length && !dotted) continue;
            note.SetElementValue("type", type.Name);
            note.Elements("dot").Remove();
            if (dotted) note.Element("type")!.AddAfterSelf(new XElement("dot"));
            return true;
        }
        return false;
    }

    // Compare musical content rather than XML formatting or enharmonic spelling.
    private static string Fingerprint(XDocument document) => string.Join("|", document.Descendants("note").Select(n =>
        $"{(n.Element("pitch") is { } p ? MusicXmlScore.MidiPitch(p).ToString(CultureInfo.InvariantCulture) : "rest")}:{n.Element("duration")?.Value}"));
}

public sealed record DistractorCandidate(string MusicXml, string Explanation);
