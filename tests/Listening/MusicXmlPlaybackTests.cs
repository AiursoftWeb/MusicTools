using System.Text.Json;
using Aiursoft.MusicTools.Services.Listening;

namespace Aiursoft.MusicTools.Tests.Listening;

[TestClass]
public class MusicXmlPlaybackTests
{
    private static JsonElement Playback(string measures) => JsonDocument.Parse(MusicXmlPlayback.Serialize(
        MusicXmlScore.Parse("<score-partwise><part id=\"P1\">" + measures + "</part></score-partwise>"))).RootElement;

    private static string Note(string step, int duration, string extra = "") =>
        $"<note>{extra}<pitch><step>{step}</step><octave>4</octave></pitch><duration>{duration}</duration><voice>1</voice></note>";

    [TestMethod]
    public void PreservesBothHandsChordsRestsAndTempo()
    {
        var data = Playback("<measure><attributes><divisions>2</divisions></attributes><direction><sound tempo=\"60\"/></direction>" +
            Note("C", 2) + Note("E", 2, "<chord/>") + "<note><rest/><duration>2</duration></note>" +
            "<backup><duration>4</duration></backup>" + Note("G", 4) + "</measure><measure>" + Note("D", 2) + "</measure>");
        var notes = data.GetProperty("notes").EnumerateArray().ToArray();
        Assert.HasCount(4, notes);
        Assert.AreEqual(0d, notes[0].GetProperty("time").GetDouble());
        Assert.AreEqual(0d, notes[1].GetProperty("time").GetDouble());
        Assert.AreEqual(2d, notes[2].GetProperty("duration").GetDouble());
        Assert.AreEqual(2d, notes[3].GetProperty("time").GetDouble());
        Assert.AreEqual(3d, data.GetProperty("duration").GetDouble());
    }

    [TestMethod]
    public void MergesTiesAndIntegratesTempoChanges()
    {
        var data = Playback("<measure><attributes><divisions>1</divisions></attributes><direction><sound tempo=\"60\"/></direction>" +
            Note("C", 1, "<tie type=\"start\"/>") + "</measure><measure><direction><sound tempo=\"120\"/></direction>" +
            Note("C", 1, "<tie type=\"stop\"/>") + Note("D", 1) + "</measure>");
        var notes = data.GetProperty("notes").EnumerateArray().ToArray();
        Assert.HasCount(2, notes);
        Assert.AreEqual(1.5, notes[0].GetProperty("duration").GetDouble());
        Assert.AreEqual(1.5, notes[1].GetProperty("time").GetDouble());
        Assert.AreEqual(2d, data.GetProperty("duration").GetDouble());
    }

    [TestMethod]
    public void RejectsUnplayablePassagesInsteadOfInventingAudio()
    {
        Assert.ThrowsExactly<InvalidDataException>(() => Playback("<measure>" + Note("C", 1, "<grace/>") + "</measure>"));
        Assert.ThrowsExactly<InvalidDataException>(() => Playback("<measure><attributes><divisions>0</divisions></attributes>" + Note("C", 1) + "</measure>"));
        Assert.ThrowsExactly<InvalidDataException>(() => Playback("<measure><backup><duration>1</duration></backup>" + Note("C", 1) + "</measure>"));
        Assert.ThrowsExactly<InvalidDataException>(() => Playback("<measure>" + Note("C", 1, "<tie type=\"stop\"/>") + "</measure>"));
    }
}
