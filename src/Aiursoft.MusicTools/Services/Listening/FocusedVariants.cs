using System.Globalization;
using System.Xml.Linq;
using Aiursoft.MusicTools.Entities;

namespace Aiursoft.MusicTools.Services.Listening;

/// <summary>One explicit edit location, not a search for random mistakes across a passage.</summary>
public static class FocusedVariants
{
    public static XElement Note(MusicXmlScore score, int position) =>
        score.CopyDocument().Descendants("note").Where(n => n.Element("pitch") != null).ElementAtOrDefault(position)
        ?? throw new InvalidDataException("The target pitched-note position does not exist in this measure.");

    public static IReadOnlyList<DistractorCandidate> Generate(MusicXmlScore source, ListeningSkill skill, int position,
        int count, IEnumerable<string>? excluded = null)
    {
        Validate(source, skill, position);
        var seen = (excluded ?? []).Select(xml => Fingerprint(MusicXmlScore.Parse(xml))).ToHashSet();
        seen.Add(Fingerprint(source));
        var candidates = new List<DistractorCandidate>();
        if (skill == ListeningSkill.Pitch)
        {
            var original = MusicXmlScore.MidiPitch(Note(source, position).Element("pitch")!);
            if (original is < 21 or > 108) throw new InvalidDataException("Choose a target note within the piano range A0–C8.");
            var fifths = (int?)source.CopyDocument().Descendants("key").FirstOrDefault()?.Element("fifths") ?? 0;
            if (Math.Abs(fifths) > 7) throw new InvalidDataException("Use a key signature with up to seven sharps or flats.");
            var altered = (fifths >= 0 ? new[] { "F", "C", "G", "D", "A", "E", "B" } : new[] { "B", "E", "A", "D", "G", "C", "F" })
                .Take(Math.Abs(fifths)).ToHashSet();
            var pitches = Enumerable.Range(Math.Max(21, original - 5), Math.Min(108, original + 5) - Math.Max(21, original - 5) + 1)
                .Where(midi => Enumerable.Range(0, 7).Any(index =>
                {
                    string[] steps = ["C", "D", "E", "F", "G", "A", "B"];
                    int[] semitones = [0, 2, 4, 5, 7, 9, 11];
                    var pitchClass = (semitones[index] + (altered.Contains(steps[index]) ? Math.Sign(fifths) : 0) + 12) % 12;
                    return midi % 12 == pitchClass;
                })).OrderBy(midi => Math.Abs(midi - original)).ThenBy(midi => midi).ToArray();
            foreach (var midi in pitches) Add(Edit(source, skill, position, midi, null));
        }
        else
        {
            foreach (var pattern in new[] { "equal", "long-short", "short-long" })
            {
                try { Add(Edit(source, skill, position, null, pattern)); }
                catch (InvalidDataException) { /* Not every source division admits every rhythm. */ }
            }
        }
        if (candidates.Count < count)
            throw new InvalidDataException("Not enough distinct versions at this one location. Try three options, another note or another measure.");
        return candidates.Take(count).ToArray();

        void Add(DistractorCandidate candidate)
        {
            if (seen.Add(Fingerprint(MusicXmlScore.Parse(candidate.MusicXml)))) candidates.Add(candidate);
        }
    }

    public static DistractorCandidate Edit(MusicXmlScore source, ListeningSkill skill, int position, int? midi, string? rhythm)
    {
        Validate(source, skill, position);
        var copy = source.CopyDocument();
        var note = copy.Descendants("note").Where(n => n.Element("pitch") != null).ElementAt(position);
        string explanation;
        if (skill == ListeningSkill.Pitch)
        {
            if (midi is null or < 21 or > 108) throw new InvalidDataException("Choose a piano pitch between A0 and C8.");
            string[] steps = ["C", "C", "D", "D", "E", "F", "F", "G", "G", "A", "A", "B"];
            var sharp = midi % 12 is 1 or 3 or 6 or 8 or 10;
            note.Element("pitch")!.ReplaceNodes(new XElement("step", steps[midi.Value % 12]),
                new XElement("alter", sharp ? 1 : 0), new XElement("octave", midi.Value / 12 - 1));
            note.Elements("accidental").Remove();
            if (note.Element("type") is { } type)
                (note.Elements("dot").LastOrDefault() ?? type).AddAfterSelf(new XElement("accidental", sharp ? "sharp" : "natural"));
            explanation = $"Target note {position + 1}: {steps[midi.Value % 12]}{(sharp ? "♯" : "")}{midi.Value / 12 - 1}. Rhythm is unchanged.";
        }
        else
        {
            var second = note.ElementsAfterSelf().First();
            var divisions = (decimal?)copy.Descendants("divisions").LastOrDefault() ?? 1;
            var total = (decimal)note.Element("duration")! + (decimal)second.Element("duration")!;
            var ratio = rhythm switch
            {
                "equal" => .5m, "long-short" => .75m, "short-long" => .25m,
                _ => throw new InvalidDataException("Choose equal, long–short or short–long rhythm.")
            };
            var firstDuration = total * ratio;
            SetLength(note, firstDuration, divisions);
            SetLength(second, total - firstDuration, divisions);
            explanation = $"Target notes {position + 1}–{position + 2}: {rhythm}. Pitches and total duration are unchanged.";
        }
        return new DistractorCandidate(copy.ToString(SaveOptions.DisableFormatting), explanation);
    }

    public static string Fingerprint(MusicXmlScore score) => string.Join("|", score.CopyDocument().Descendants("note")
        .Select(n => $"{(n.Element("pitch") is { } p ? MusicXmlScore.MidiPitch(p) : -1)}:{((decimal?)n.Element("duration"))?.ToString("G29", CultureInfo.InvariantCulture)}"));

    private static void Validate(MusicXmlScore score, ListeningSkill skill, int position)
    {
        if (score.Parts.Count != 1 || score.Parts[0].MeasureLabels.Count != 1 ||
            skill is not (ListeningSkill.Pitch or ListeningSkill.Rhythm))
            throw new InvalidDataException("Focused listening uses one target measure and either pitch or rhythm, not mixed edits.");
        var note = Note(score, position);
        if (!Editable(note)) throw new InvalidDataException("Choose a target note without a chord, tie, grace note or tuplet.");
        if (skill == ListeningSkill.Rhythm)
        {
            var next = note.ElementsAfterSelf().FirstOrDefault();
            if (next == null || next.Name != "note" || next.Element("pitch") == null || !Editable(next) ||
                (string?)next.Element("voice") != (string?)note.Element("voice") ||
                (string?)next.Element("staff") != (string?)note.Element("staff"))
                throw new InvalidDataException("Rhythm focus needs two adjacent pitched notes in the same voice and staff.");
        }
    }

    private static bool Editable(XElement note) => note.Element("chord") == null && note.Element("tie") == null &&
        note.Element("grace") == null && note.Element("time-modification") == null &&
        note.Element("notations")?.Element("tied") == null &&
        note.ElementsAfterSelf().FirstOrDefault()?.Element("chord") == null;

    private static void SetLength(XElement note, decimal duration, decimal divisions)
    {
        if (duration <= 0 || duration != decimal.Truncate(duration) || divisions <= 0)
            throw new InvalidDataException("This score's rhythmic resolution cannot represent the selected pattern.");
        (string Name, decimal Beats)[] types = [("whole", 4), ("half", 2), ("quarter", 1), ("eighth", .5m),
            ("16th", .25m), ("32nd", .125m), ("64th", .0625m)];
        foreach (var type in types)
        {
            var dotted = duration / divisions == type.Beats * 1.5m;
            if (duration / divisions != type.Beats && !dotted) continue;
            note.SetElementValue("duration", duration.ToString("0", CultureInfo.InvariantCulture));
            note.SetElementValue("type", type.Name);
            note.Elements("dot").Remove();
            if (dotted) note.Element("type")!.AddAfterSelf(new XElement("dot"));
            note.Elements("beam").Remove();
            return;
        }
        throw new InvalidDataException("Choose a rhythm representable with ordinary or dotted note values.");
    }
}
