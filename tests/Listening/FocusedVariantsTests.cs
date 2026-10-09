using System.Text.Json;
using System.Xml.Linq;
using Aiursoft.MusicTools.Entities;
using Aiursoft.MusicTools.Services.Listening;

namespace Aiursoft.MusicTools.Tests.Listening;

[TestClass]
public class FocusedVariantsTests
{
    private const string Measure = "<measure number=\"1\"><attributes><divisions>4</divisions><key><fifths>0</fifths></key></attributes>" +
        "<note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>" +
        "<note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>" +
        "<note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note>" +
        "<note><pitch><step>F</step><octave>4</octave></pitch><duration>4</duration><type>quarter</type></note></measure>";

    private static MusicXmlScore Score(string measures = Measure) =>
        MusicXmlScore.Parse("<score-partwise><part id=\"P1\">" + measures + "</part></score-partwise>");

    [TestMethod]
    public void PitchVersionsChangeOnlyTheDeclaredPitchedNoteAndPreserveRhythm()
    {
        var source = Score();
        var baseline = XDocument.Parse(source.ToXml()).Descendants("note").ToArray();
        var versions = FocusedVariants.Generate(source, ListeningSkill.Pitch, 1, 3);
        Assert.HasCount(3, versions);
        Assert.HasCount(3, versions.Select(v => FocusedVariants.Fingerprint(MusicXmlScore.Parse(v.MusicXml))).Distinct().ToArray());
        foreach (var version in versions)
        {
            var notes = XDocument.Parse(version.MusicXml).Descendants("note").ToArray();
            for (var i = 0; i < notes.Length; i++)
            {
                Assert.AreEqual(baseline[i].Element("duration")!.Value, notes[i].Element("duration")!.Value);
                if (i == 1) Assert.IsFalse(XNode.DeepEquals(baseline[i].Element("pitch"), notes[i].Element("pitch")));
                else Assert.IsTrue(XNode.DeepEquals(baseline[i], notes[i]));
            }
        }
    }

    [TestMethod]
    public void RhythmVersionsChangeOnlyTheSamePairAndKeepPitchesAndTotalTime()
    {
        var source = Score();
        var baseline = XDocument.Parse(source.ToXml()).Descendants("note").ToArray();
        var versions = FocusedVariants.Generate(source, ListeningSkill.Rhythm, 0, 2);
        foreach (var version in versions)
        {
            var notes = XDocument.Parse(version.MusicXml).Descendants("note").ToArray();
            Assert.AreEqual(8, (int)notes[0].Element("duration")! + (int)notes[1].Element("duration")!);
            for (var i = 0; i < notes.Length; i++)
            {
                Assert.IsTrue(XNode.DeepEquals(baseline[i].Element("pitch"), notes[i].Element("pitch")));
                if (i > 1) Assert.IsTrue(XNode.DeepEquals(baseline[i], notes[i]));
            }
        }
        Assert.ThrowsExactly<InvalidDataException>(() => FocusedVariants.Generate(source, ListeningSkill.Rhythm, 0, 3));
    }

    [TestMethod]
    public void ManualPitchEditUsesSameLocationAndRejectsMixedOrUnavailableLocations()
    {
        var source = Score();
        var edit = FocusedVariants.Edit(source, ListeningSkill.Pitch, 2, 67, null);
        var note = FocusedVariants.Note(MusicXmlScore.Parse(edit.MusicXml), 2);
        Assert.AreEqual("G", note.Element("pitch")!.Element("step")!.Value);
        Assert.ThrowsExactly<InvalidDataException>(() => FocusedVariants.Generate(source, ListeningSkill.Mixed, 0, 2));
        Assert.ThrowsExactly<InvalidDataException>(() => FocusedVariants.Generate(source, ListeningSkill.Pitch, 99, 2));
        Assert.ThrowsExactly<InvalidDataException>(() => FocusedVariants.Generate(source, ListeningSkill.Rhythm, 3, 2));
    }

    [TestMethod]
    public void ContextReplacementDoesNotChangeSurroundingMeasuresOrTheirTiming()
    {
        var context = Score(Measure + Measure + Measure);
        var shortScore = context.Excerpt("P1", 1, 1);
        var edit = FocusedVariants.Edit(shortScore, ListeningSkill.Pitch, 1, 67, null);
        var revised = context.ReplaceMeasure(1, MusicXmlScore.Parse(edit.MusicXml));
        Assert.AreEqual(FocusedVariants.Fingerprint(context.Excerpt("P1", 0, 1)), FocusedVariants.Fingerprint(revised.Excerpt("P1", 0, 1)));
        Assert.AreEqual(FocusedVariants.Fingerprint(context.Excerpt("P1", 2, 1)), FocusedVariants.Fingerprint(revised.Excerpt("P1", 2, 1)));
        using var originalAudio = JsonDocument.Parse(MusicXmlPlayback.Serialize(context));
        using var revisedAudio = JsonDocument.Parse(MusicXmlPlayback.Serialize(revised));
        Assert.AreEqual(originalAudio.RootElement.GetProperty("duration").GetDouble(), revisedAudio.RootElement.GetProperty("duration").GetDouble());
        Assert.AreEqual(6d, revisedAudio.RootElement.GetProperty("duration").GetDouble());
    }
}
