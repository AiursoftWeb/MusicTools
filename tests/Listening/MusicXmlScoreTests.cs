using System.IO.Compression;
using System.Xml;
using System.Xml.Linq;
using Aiursoft.MusicTools.Entities;
using Aiursoft.MusicTools.Services.Listening;

namespace Aiursoft.MusicTools.Tests.Listening;

[TestClass]
public class MusicXmlScoreTests
{
    private static string Note(string step = "C", int staff = 1, int duration = 4) =>
        $"<note><pitch><step>{step}</step><octave>4</octave></pitch><duration>{duration}</duration><voice>{staff}</voice><type>quarter</type><staff>{staff}</staff></note>";

    private static string Score(string measures) =>
        $"<score-partwise version=\"4.0\"><part-list><score-part id=\"P1\"><part-name>Piano</part-name></score-part></part-list><part id=\"P1\">{measures}</part></score-partwise>";

    private static string PianoScore() => Score(
        "<measure number=\"0\" implicit=\"yes\"><attributes><divisions>4</divisions><key><fifths>2</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><staves>2</staves><clef number=\"1\"><sign>G</sign><line>2</line></clef><clef number=\"2\"><sign>F</sign><line>4</line></clef></attributes><direction><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>72</per-minute></metronome></direction-type><sound tempo=\"72\"/></direction>" + Note() + "</measure>" +
        "<measure number=\"1\"><attributes><key><fifths>-1</fifths></key></attributes>" + Note("D") + "</measure>" +
        "<measure number=\"2\">" + Note("E") + Note("F") + "<backup><duration>8</duration></backup>" + Note("G", 2, 8) + "</measure>" +
        string.Concat(Enumerable.Range(3, 4).Select(i => $"<measure number=\"{i}\">{Note("A")}{Note("B")}</measure>")));

    [TestMethod]
    public void ExcerptUsesPositionsAndAccumulatesContext()
    {
        var score = MusicXmlScore.Parse(PianoScore());
        Assert.AreEqual("Piano", score.Parts[0].Name);
        Assert.AreEqual("0", score.Parts[0].MeasureLabels[0]);
        Assert.AreEqual(2, score.Parts[0].Staves);
        var excerpt = XDocument.Parse(score.Excerpt("P1", 2, 5).ToXml());
        Assert.HasCount(5, excerpt.Descendants("measure").ToArray());
        Assert.AreEqual("2", excerpt.Descendants("measure").First().Attribute("number")!.Value);
        Assert.AreEqual("-1", excerpt.Descendants("fifths").First().Value);
        Assert.AreEqual("4", excerpt.Descendants("divisions").First().Value);
        Assert.AreEqual("4", excerpt.Descendants("beats").First().Value);
        Assert.AreEqual("72", excerpt.Descendants("sound").First().Attribute("tempo")!.Value);
        Assert.HasCount(2, excerpt.Descendants("clef").ToArray());
    }

    [TestMethod]
    public void PickupAndPrintedNumbersArePreserved()
    {
        var excerpt = XDocument.Parse(MusicXmlScore.Parse(PianoScore()).Excerpt("P1", 0, 1).ToXml());
        Assert.AreEqual("yes", excerpt.Descendants("measure").Single().Attribute("implicit")!.Value);
        Assert.AreEqual("4", excerpt.Descendants("note").Single().Element("duration")!.Value);
    }

    [TestMethod]
    public void StaffSelectionPreservesCursorAndRemapsClef()
    {
        var score = MusicXmlScore.Parse(PianoScore());
        var right = XDocument.Parse(score.Excerpt("P1", 2, 1, 1).ToXml());
        Assert.HasCount(2, right.Descendants("note").ToArray());
        Assert.AreEqual("8", right.Descendants("forward").Single().Element("duration")!.Value);
        Assert.AreEqual("8", right.Descendants("backup").Single().Element("duration")!.Value);
        var left = XDocument.Parse(score.Excerpt("P1", 2, 1, 2).ToXml());
        Assert.AreEqual("G", left.Descendants("note").Single().Element("pitch")!.Element("step")!.Value);
        Assert.AreEqual("F", left.Descendants("clef").Single().Element("sign")!.Value);
        Assert.AreEqual("1", left.Descendants("staff").Single().Value);
    }

    [TestMethod]
    public void RejectsInvalidRangeAndPart()
    {
        var score = MusicXmlScore.Parse(PianoScore());
        Assert.ThrowsExactly<InvalidDataException>(() => score.Excerpt("P1", -1, 1));
        Assert.ThrowsExactly<InvalidDataException>(() => score.Excerpt("P1", 6, 2));
        Assert.ThrowsExactly<InvalidDataException>(() => score.Excerpt("P1", 0, 0));
        Assert.ThrowsExactly<InvalidDataException>(() => score.Excerpt("P2", 0, 1));
        Assert.ThrowsExactly<InvalidDataException>(() => score.Excerpt("P1", 0, 1, 3));
    }

    [TestMethod]
    public void ExcerptsRemoveSourceLayoutHintsForConsistentOptionEngraving()
    {
        var note = Note().Replace("<note>", "<note default-x=\"20\" color=\"#ff0000\">")
            .Replace("</note>", "<stem>up</stem><beam number=\"1\">begin</beam></note>");
        var excerpt = MusicXmlScore.Parse(Score($"<measure number=\"1\" width=\"100\">{note}</measure>"))
            .Excerpt("P1", 0, 1);
        var xml = XDocument.Parse(excerpt.ToXml());
        Assert.IsFalse(xml.Descendants("stem").Any());
        Assert.IsFalse(xml.Descendants("beam").Any());
        Assert.IsFalse(xml.Descendants().Attributes("default-x").Any());
        Assert.IsFalse(xml.Descendants().Attributes("color").Any());
        Assert.IsFalse(xml.Descendants().Attributes("width").Any());
    }

    [TestMethod]
    public void RejectsTiesCrossingExcerptBoundary()
    {
        var start = Note().Replace("</duration>", "</duration><tie type=\"start\"/>");
        var stop = Note().Replace("</duration>", "</duration><tie type=\"stop\"/>");
        var score = MusicXmlScore.Parse(Score($"<measure number=\"1\">{start}</measure><measure number=\"2\">{stop}</measure>"));
        Assert.ThrowsExactly<InvalidDataException>(() => score.Excerpt("P1", 0, 1));
        Assert.ThrowsExactly<InvalidDataException>(() => score.Excerpt("P1", 1, 1));
        Assert.HasCount(2, score.Excerpt("P1", 0, 2).Parts[0].MeasureLabels);
    }

    [TestMethod]
    public void CompressedScoreFollowsContainerInsteadOfFirstXml()
    {
        using var data = new MemoryStream();
        using (var zip = new ZipArchive(data, ZipArchiveMode.Create, leaveOpen: true))
        {
            WriteEntry(zip, "unrelated.xml", "<unrelated/>");
            WriteEntry(zip, "META-INF/container.xml", "<container xmlns=\"urn:oasis:names:tc:opendocument:xmlns:container\"><rootfiles><rootfile full-path=\"score/main.musicxml\"/></rootfiles></container>");
            WriteEntry(zip, "score/main.musicxml", PianoScore());
        }
        data.Position = 0;
        Assert.HasCount(7, MusicXmlScore.ReadCompressed(data).Parts[0].MeasureLabels);
    }

    [TestMethod]
    public void ExternalEntitiesAreNotResolvedButNormalDoctypeIsAccepted()
    {
        var normal = "<!DOCTYPE score-partwise PUBLIC \"-//Recordare//DTD MusicXML 4.0 Partwise//EN\" \"https://invalid.example/score.dtd\">" + PianoScore();
        Assert.HasCount(1, MusicXmlScore.Parse(normal).Parts);
        var hostile = "<!DOCTYPE score-partwise [<!ENTITY secret SYSTEM \"file:///etc/passwd\">]>" + PianoScore().Replace("Piano", "&secret;");
        Assert.ThrowsExactly<XmlException>(() => MusicXmlScore.Parse(hostile));
    }

    [TestMethod]
    public void PitchDistractorsPreserveRhythmAndAreDistinct()
    {
        var score = MusicXmlScore.Parse(PianoScore()).Excerpt("P1", 2, 3, 1);
        var options = new DistractorGenerator().Generate(score, ListeningSkill.Pitch);
        Assert.HasCount(5, options);
        Assert.HasCount(5, options.Select(o => o.MusicXml).Distinct().ToArray());
        var durations = XDocument.Parse(score.ToXml()).Descendants("duration").Select(e => e.Value).ToArray();
        foreach (var option in options)
        {
            Assert.Contains("rhythm is unchanged", option.Explanation);
            var parsed = XDocument.Parse(option.MusicXml);
            CollectionAssert.AreEqual(durations, parsed.Descendants("duration").Select(e => e.Value).ToArray());
            Assert.AreNotEqual(score.ToXml(), option.MusicXml);
            Assert.IsTrue(parsed.Descendants("accidental").Any());
        }
    }

    [TestMethod]
    public void RhythmDistractorsPreservePitchesAndMeasureDuration()
    {
        var score = MusicXmlScore.Parse(PianoScore()).Excerpt("P1", 3, 3);
        var source = XDocument.Parse(score.ToXml());
        var pitches = source.Descendants("pitch").Select(p => p.ToString()).ToArray();
        var options = new DistractorGenerator().Generate(score, ListeningSkill.Rhythm);
        Assert.HasCount(5, options);
        foreach (var option in options)
        {
            var parsed = XDocument.Parse(option.MusicXml);
            CollectionAssert.AreEqual(pitches, parsed.Descendants("pitch").Select(p => p.ToString()).ToArray());
            foreach (var measure in parsed.Descendants("measure"))
                Assert.AreEqual(8, measure.Elements("note").Sum(n => (int)n.Element("duration")!));
        }
    }

    [TestMethod]
    public void MixedDistractorsChangeBothPitchAndRhythmWithoutChangingTotalDuration()
    {
        var score = MusicXmlScore.Parse(PianoScore()).Excerpt("P1", 3, 3);
        var source = XDocument.Parse(score.ToXml());
        var originalPitches = string.Join('|', source.Descendants("pitch"));
        var originalDurations = string.Join('|', source.Descendants("note").Select(n => n.Element("duration")!.Value));
        var candidates = new DistractorGenerator().Generate(score, ListeningSkill.Mixed);
        Assert.HasCount(5, candidates);
        foreach (var candidate in candidates)
        {
            var parsed = XDocument.Parse(candidate.MusicXml);
            Assert.AreNotEqual(originalPitches, string.Join('|', parsed.Descendants("pitch")));
            Assert.AreNotEqual(originalDurations, string.Join('|', parsed.Descendants("note").Select(n => n.Element("duration")!.Value)));
            foreach (var measure in parsed.Descendants("measure"))
                Assert.AreEqual(8, measure.Elements("note").Sum(n => (int)n.Element("duration")!));
        }
    }

    [TestMethod]
    public void RegenerationExcludesExistingCandidatesAndFailsClearlyForInsufficientMaterial()
    {
        var score = MusicXmlScore.Parse(PianoScore()).Excerpt("P1", 3, 3);
        var generator = new DistractorGenerator();
        var first = generator.Generate(score, ListeningSkill.Pitch);
        var replacement = generator.Generate(score, ListeningSkill.Pitch, 1, first.Select(o => o.MusicXml));
        Assert.IsFalse(first.Any(o => o.MusicXml == replacement[0].MusicXml));
        var shortScore = MusicXmlScore.Parse(PianoScore()).Excerpt("P1", 0, 1);
        Assert.ThrowsExactly<InvalidDataException>(() => generator.Generate(shortScore, ListeningSkill.Rhythm));
    }

    private static void WriteEntry(ZipArchive archive, string path, string content)
    {
        using var writer = new StreamWriter(archive.CreateEntry(path).Open());
        writer.Write(content);
    }
}
