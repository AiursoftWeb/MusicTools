using System.Globalization;
using System.IO.Compression;
using System.Xml;
using System.Xml.Linq;

namespace Aiursoft.MusicTools.Services.Listening;

/// <summary>
/// One canonical score representation shared by preview, question generation and audio export.
/// Measure positions are zero-based; printed measure numbers are labels, not identifiers.
/// </summary>
public sealed class MusicXmlScore
{
    public const int MaxXmlCharacters = 20 * 1024 * 1024;
    private readonly XDocument document;

    private MusicXmlScore(XDocument document)
    {
        this.document = document;
        if (document.Root?.Name != "score-partwise" || !document.Root.Elements("part").Any())
        {
            throw new InvalidDataException("A partwise MusicXML score is required. Re-export the score with MuseScore.");
        }
        var parts = document.Root.Elements("part").ToArray();
        if (parts.Any(p => p.Attribute("id") == null || !p.Elements("measure").Any()) ||
            parts.Select(p => (string?)p.Attribute("id")).Distinct().Count() != parts.Length)
        {
            throw new InvalidDataException("Each score part must have a unique ID and at least one measure.");
        }
    }

    public static MusicXmlScore Parse(string xml) => new(ReadXml(new StringReader(xml)));

    public static MusicXmlScore ReadCompressed(Stream stream)
    {
        using var archive = new ZipArchive(stream, ZipArchiveMode.Read, leaveOpen: true);
        if (archive.Entries.Count > 1000 || archive.Entries.Sum(e => e.Length) > MaxXmlCharacters * 4L)
        {
            throw new InvalidDataException("The expanded score archive is too large.");
        }
        var container = archive.GetEntry("META-INF/container.xml") ??
                        throw new InvalidDataException("The MXL archive has no META-INF/container.xml.");
        using var containerReader = new StreamReader(container.Open());
        var manifest = ReadXml(containerReader);
        var path = manifest.Descendants().FirstOrDefault(e => e.Name.LocalName == "rootfile")?
            .Attribute("full-path")?.Value;
        if (string.IsNullOrWhiteSpace(path) || path.StartsWith('/') || path.Contains('\\') ||
            path.Split('/').Any(segment => segment is ".." or "." or ""))
        {
            throw new InvalidDataException("The MXL rootfile path is invalid.");
        }
        var entry = archive.GetEntry(path) ?? throw new InvalidDataException("The MXL rootfile is missing.");
        using var reader = new StreamReader(entry.Open());
        return new MusicXmlScore(ReadXml(reader));
    }

    private static XDocument ReadXml(TextReader reader)
    {
        // MusicXML exports commonly contain a public DOCTYPE. Ignore it without fetching a DTD
        // or expanding user-defined entities; rejecting every DOCTYPE would reject normal exports.
        using var xmlReader = XmlReader.Create(reader, new XmlReaderSettings
        {
            DtdProcessing = DtdProcessing.Ignore,
            XmlResolver = null,
            MaxCharactersInDocument = MaxXmlCharacters
        });
        return XDocument.Load(xmlReader);
    }

    public string ToXml() => document.ToString(SaveOptions.DisableFormatting);

    public IReadOnlyList<ScorePartInfo> Parts => document.Root!.Elements("part").Select(part =>
        new ScorePartInfo(
            (string)part.Attribute("id")!,
            document.Root.Element("part-list")?.Elements("score-part")
                .FirstOrDefault(p => (string?)p.Attribute("id") == (string?)part.Attribute("id"))?
                .Element("part-name")?.Value ?? "Part",
            part.Elements("measure").Select(m => (string?)m.Attribute("number") ?? "?").ToArray(),
            Math.Max(1, part.Descendants("staves").Select(s => (int)s).DefaultIfEmpty(1).Max())))
        .ToArray();

    public MusicXmlScore Excerpt(string partId, int start, int count, int? staff = null)
    {
        var original = document.Root!.Elements("part").FirstOrDefault(p => (string?)p.Attribute("id") == partId)
                       ?? throw new InvalidDataException("The selected part does not exist.");
        var measures = original.Elements("measure").ToArray();
        if (start < 0 || count < 1 || count > 32 || start > measures.Length - count)
        {
            throw new InvalidDataException("Select between 1 and 32 consecutive measures within the score.");
        }
        if (staff is < 1 || staff > Parts.Single(p => p.Id == partId).Staves)
        {
            throw new InvalidDataException("The selected staff does not exist.");
        }

        var selected = measures.Skip(start).Take(count).Select(m => new XElement(m)).ToArray();
        var inherited = new XElement("attributes");
        foreach (var attribute in measures.Take(start).SelectMany(m => m.Elements("attributes")).Elements())
        {
            inherited.Elements(attribute.Name)
                .Where(e => (string?)e.Attribute("number") == (string?)attribute.Attribute("number"))
                .Remove();
            inherited.Add(new XElement(attribute));
        }
        if (inherited.HasElements)
        {
            selected[0].AddFirst(inherited);
        }

        // A passage is played once as written, without repeats or navigation outside its boundaries.
        var part = new XElement("part", new XAttribute("id", partId), selected);
        part.Descendants("print").Remove();
        part.Descendants("barline").Remove();
        part.Descendants("lyric").Remove();
        // All versions use the same automatic engraving. Existing beam/stem/layout hints
        // would otherwise reveal which option was edited (or retain invalid beams after rhythm edits).
        // The browser renderer must enable OSMD's autoBeam option.
        part.Descendants("beam").Remove();
        part.Descendants("stem").Remove();
        part.DescendantsAndSelf().Attributes().Where(a => a.Name.LocalName is
            "default-x" or "default-y" or "relative-x" or "relative-y" or "width" or "color").Remove();
        foreach (var direction in part.Descendants("direction").ToArray())
        {
            direction.Descendants("words").Remove();
            direction.Descendants("segno").Remove();
            direction.Descendants("coda").Remove();
            foreach (var sound in direction.Elements("sound"))
            {
                sound.Attributes().Where(a => a.Name.LocalName is "dacapo" or "dalsegno" or "tocoda" or
                    "fine" or "segno" or "coda" or "forward-repeat").Remove();
            }
        }
        var tempo = measures.Take(start).SelectMany(m => m.Descendants("sound"))
            .LastOrDefault(s => s.Attribute("tempo") != null)?.Attribute("tempo")?.Value;
        if (tempo != null)
        {
            var tempoDirection = new XElement("direction", new XElement("direction-type",
                    new XElement("metronome", new XElement("beat-unit", "quarter"), new XElement("per-minute", tempo))),
                new XElement("sound", new XAttribute("tempo", tempo)));
            var firstNonAttribute = selected[0].Elements().FirstOrDefault(e => e.Name != "attributes");
            if (firstNonAttribute == null) selected[0].Add(tempoDirection);
            else firstNonAttribute.AddBeforeSelf(tempoDirection);
        }

        if (staff.HasValue) SelectStaff(part, staff.Value);
        foreach (var attributes in part.Elements("measure").Elements("attributes"))
        {
            // Accumulating a later key/clef must not move it behind later schema elements.
            string[] order = ["footnote", "level", "divisions", "key", "time", "staves", "part-symbol",
                "instruments", "clef", "staff-details", "transpose", "for-part", "directive", "measure-style"];
            attributes.ReplaceNodes(attributes.Elements().OrderBy(e => Array.IndexOf(order, e.Name.LocalName)).ToList());
        }
        ValidateTies(part);
        var definition = document.Root.Element("part-list")?.Elements("score-part")
            .FirstOrDefault(p => (string?)p.Attribute("id") == partId);
        var scorePart = definition == null
            ? new XElement("score-part", new XAttribute("id", partId))
            : new XElement(definition);
        scorePart.Elements("part-name").Remove();
        scorePart.Elements("part-abbreviation").Remove();
        scorePart.AddFirst(new XElement("part-name", ""));
        return new MusicXmlScore(new XDocument(new XElement("score-partwise", new XAttribute("version", "4.0"),
            new XElement("part-list", scorePart), part)));
    }

    private static void SelectStaff(XElement part, int staff)
    {
        foreach (var note in part.Descendants("note").ToArray())
        {
            if (((int?)note.Element("staff") ?? 1) == staff) continue;
            // Keep the MusicXML cursor in place for other voices; a chord note does not advance it.
            if (note.Element("chord") != null || note.Element("duration") == null) note.Remove();
            else note.ReplaceWith(new XElement("forward", new XElement(note.Element("duration")!)));
        }
        part.Descendants("direction").Where(d => d.Element("staff") != null && (int)d.Element("staff")! != staff).Remove();
        foreach (var attributes in part.Elements("measure").Elements("attributes"))
        {
            attributes.Elements().Where(e => e.Attribute("number") != null && (int)e.Attribute("number")! != staff).Remove();
            foreach (var numbered in attributes.Elements().Attributes("number")) numbered.Value = "1";
            attributes.SetElementValue("staves", 1);
        }
        foreach (var staffElement in part.Descendants("staff")) staffElement.Value = "1";
    }

    private static void ValidateTies(XElement part)
    {
        var active = new HashSet<string>();
        foreach (var note in part.Descendants("note"))
        {
            var pitch = note.Element("pitch");
            if (pitch == null) continue;
            var key = $"{note.Element("voice")?.Value ?? "1"}:{note.Element("staff")?.Value ?? "1"}:{MidiPitch(pitch)}";
            if (note.Elements("tie").Any(t => (string?)t.Attribute("type") == "stop") && !active.Remove(key))
                throw new InvalidDataException("A tie enters this passage. Include the preceding tied note.");
            if (note.Elements("tie").Any(t => (string?)t.Attribute("type") == "start")) active.Add(key);
        }
        if (active.Count > 0)
            throw new InvalidDataException("A tie leaves this passage. Include the following tied note.");
    }

    internal XDocument CopyDocument() => new(document);

    public MusicXmlScore ReplaceMeasure(int position, MusicXmlScore replacement)
    {
        var copy = CopyDocument();
        var measures = copy.Root!.Element("part")!.Elements("measure").ToArray();
        var source = replacement.document.Root!.Element("part")!.Elements("measure").ToArray();
        if (position < 0 || position >= measures.Length || source.Length != 1)
            throw new InvalidDataException("Replace exactly one measure within the listening context.");
        // The short excerpt carries the active attributes. Restore the original next
        // measure's context so an edited divisions/key/clef cannot leak downstream.
        if (position + 1 < measures.Length)
        {
            var restore = new XElement("attributes");
            foreach (var attribute in measures.Take(position + 1).SelectMany(m => m.Elements("attributes")).Elements())
            {
                restore.Elements(attribute.Name).Where(e =>
                    (string?)e.Attribute("number") == (string?)attribute.Attribute("number")).Remove();
                restore.Add(new XElement(attribute));
            }
            if (restore.HasElements) measures[position + 1].AddFirst(restore);
        }
        var revised = new XElement(source[0]);
        revised.SetAttributeValue("number", (string?)measures[position].Attribute("number") ?? "1");
        measures[position].ReplaceWith(revised);
        return new MusicXmlScore(copy);
    }

    internal static int MidiPitch(XElement pitch)
    {
        var semitone = pitch.Element("step")?.Value switch
        {
            "C" => 0, "D" => 2, "E" => 4, "F" => 5, "G" => 7, "A" => 9, "B" => 11,
            _ => throw new InvalidDataException("Unsupported note pitch.")
        };
        if (!int.TryParse(pitch.Element("octave")?.Value, out var octave) ||
            !int.TryParse(pitch.Element("alter")?.Value ?? "0", NumberStyles.Integer, CultureInfo.InvariantCulture, out var alter))
            throw new InvalidDataException("Microtonal or invalid pitches cannot be used for automatic distractors.");
        return (octave + 1) * 12 + semitone + alter;
    }
}

public sealed record ScorePartInfo(string Id, string Name, IReadOnlyList<string> MeasureLabels, int Staves);
