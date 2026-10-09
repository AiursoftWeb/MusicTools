using System.Globalization;
using System.Text.Json;
using System.Xml.Linq;

namespace Aiursoft.MusicTools.Services.Listening;

/// <summary>Timing data only. Browsers render it with the application's local piano samples.</summary>
public static class MusicXmlPlayback
{
    public static byte[] Serialize(MusicXmlScore score, bool allowSilence = false)
    {
        var notes = new List<TimedNote>();
        var tempos = new SortedDictionary<double, double> { [0] = 120 };
        var document = score.CopyDocument();
        double scoreEnd = 0;
        foreach (var part in document.Root!.Elements("part"))
        {
            double measureStart = 0, divisions = 1;
            var ties = new Dictionary<string, int>();
            foreach (var measure in part.Elements("measure"))
            {
                double cursor = measureStart, end = measureStart, chordStart = measureStart;
                foreach (var element in measure.Elements())
                {
                    if (element.Name == "attributes" && element.Element("divisions") is { } division)
                    {
                        divisions = Number(division.Value);
                        if (divisions <= 0) throw new InvalidDataException("MusicXML divisions must be positive.");
                    }
                    else if (element.Name == "direction")
                    {
                        var tempo = element.Descendants("sound").Attributes("tempo").FirstOrDefault()?.Value;
                        if (tempo == null && element.Descendants("metronome").FirstOrDefault() is { } metronome)
                        {
                            var unit = metronome.Element("beat-unit")?.Value;
                            var factor = unit switch { "whole" => 4, "half" => 2, "eighth" => .5, "16th" => .25, _ => 1 };
                            if (metronome.Element("beat-unit-dot") != null) factor *= 1.5;
                            if (metronome.Element("per-minute") is { } perMinute)
                                tempo = (Number(perMinute.Value) * factor).ToString(CultureInfo.InvariantCulture);
                        }
                        if (tempo != null)
                        {
                            var bpm = Number(tempo);
                            if (bpm is < 10 or > 600) throw new InvalidDataException("Tempo must be between 10 and 600 quarter notes per minute.");
                            var offset = element.Element("offset") is { } value ? Number(value.Value) / divisions : 0;
                            tempos[Math.Max(0, cursor + offset)] = bpm;
                        }
                    }
                    else if (element.Name == "backup" || element.Name == "forward")
                    {
                        var duration = Number(element.Element("duration")?.Value ?? "0") / divisions;
                        if (duration < 0) throw new InvalidDataException("MusicXML durations cannot be negative.");
                        cursor += element.Name == "backup" ? -duration : duration;
                        if (cursor < measureStart - .0001) throw new InvalidDataException("A voice moves before the start of its measure.");
                        end = Math.Max(end, cursor);
                    }
                    else if (element.Name == "note")
                    {
                        if (element.Element("grace") != null)
                            throw new InvalidDataException("Grace-note playback is not supported yet. Choose a passage without grace notes.");
                        var duration = Number(element.Element("duration")?.Value ?? "0") / divisions;
                        if (duration <= 0) throw new InvalidDataException("Every played note or rest must have a positive duration.");
                        var onset = element.Element("chord") != null ? chordStart : cursor;
                        if (element.Element("chord") == null) { chordStart = onset; cursor += duration; }
                        end = Math.Max(end, onset + duration);
                        if (element.Element("rest") != null) continue;
                        var pitch = element.Element("pitch") ?? throw new InvalidDataException("Only pitched notes are supported for listening playback.");
                        var midi = MusicXmlScore.MidiPitch(pitch);
                        if (midi is < 21 or > 108 || Number(pitch.Element("alter")?.Value ?? "0") % 1 != 0)
                            throw new InvalidDataException("Listening playback supports piano pitches A0–C8 without microtones.");
                        var key = $"{element.Element("voice")?.Value ?? "1"}:{element.Element("staff")?.Value ?? "1"}:{midi}";
                        var stop = element.Elements("tie").Any(t => (string?)t.Attribute("type") == "stop");
                        var start = element.Elements("tie").Any(t => (string?)t.Attribute("type") == "start");
                        if (stop)
                        {
                            if (!ties.TryGetValue(key, out var index) || Math.Abs(notes[index].End - onset) > .0001)
                                throw new InvalidDataException("A tied note has no matching preceding note.");
                            notes[index] = notes[index] with { End = onset + duration };
                        }
                        else
                        {
                            notes.Add(new TimedNote(midi, onset, onset + duration));
                            if (start) ties[key] = notes.Count - 1;
                        }
                        if (stop && !start) ties.Remove(key);
                        if (notes.Count > 10000) throw new InvalidDataException("The passage contains too many notes.");
                    }
                }
                measureStart = end;
            }
            if (ties.Count != 0) throw new InvalidDataException("Complete tied notes before ending the passage.");
            scoreEnd = Math.Max(scoreEnd, measureStart);
        }
        if (notes.Count == 0 && !allowSilence) throw new InvalidDataException("Select a passage containing pitched notes.");
        double Seconds(double position)
        {
            double seconds = 0, previous = 0, bpm = 120;
            foreach (var tempo in tempos)
            {
                if (tempo.Key > position) break;
                seconds += (tempo.Key - previous) * 60 / bpm;
                previous = tempo.Key;
                bpm = tempo.Value;
            }
            return seconds + (position - previous) * 60 / bpm;
        }
        var events = notes.Select(n => new
        {
            midi = n.Midi, time = Seconds(n.Start), duration = Seconds(n.End) - Seconds(n.Start)
        }).OrderBy(n => n.time).ToArray();
        var total = Seconds(scoreEnd);
        if (total > 180) throw new InvalidDataException("Choose a passage shorter than three minutes.");
        return JsonSerializer.SerializeToUtf8Bytes(new { duration = total, notes = events });
    }

    private static double Number(string value) =>
        double.TryParse(value, NumberStyles.Float, CultureInfo.InvariantCulture, out var result) && double.IsFinite(result)
            ? result : throw new InvalidDataException("MusicXML contains an invalid numeric value.");

    private sealed record TimedNote(int Midi, double Start, double End);
}
