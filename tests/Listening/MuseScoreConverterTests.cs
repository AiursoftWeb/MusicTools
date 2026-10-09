using System.IO.Compression;
using Aiursoft.MusicTools.Services.Listening;

namespace Aiursoft.MusicTools.Tests.Listening;

[TestClass]
public class MusicXmlConverterTests
{
    private const string Xml = "<score-partwise><part-list><score-part id=\"P1\"><part-name>Test</part-name></score-part></part-list><part id=\"P1\"><measure number=\"1\"><note><rest/><duration>4</duration></note></measure></part></score-partwise>";

    private static MusicXmlConverter Converter() => new();

    [TestMethod]
    public async Task ImportsXmlAndMusicXmlWithoutNativeConverterAndPreservesOriginal()
    {
        var folder = Directory.CreateTempSubdirectory("musictools-import-test-");
        try
        {
            var converter = Converter();
            foreach (var extension in new[] { ".xml", ".musicxml" })
            {
                var path = Path.Combine(folder.FullName, "score" + extension);
                await File.WriteAllTextAsync(path, Xml);
                var score = await converter.ImportAsync(path);
                Assert.HasCount(1, score.Parts);
                Assert.AreEqual(Xml, await File.ReadAllTextAsync(path));
            }
        }
        finally
        {
            folder.Delete(true);
        }
    }

    [TestMethod]
    public async Task ImportsMxlRootMusicXmlWithoutNativeConverter()
    {
        var folder = Directory.CreateTempSubdirectory("musictools-import-test-");
        try
        {
            var path = Path.Combine(folder.FullName, "score.mxl");
            using (var zip = ZipFile.Open(path, ZipArchiveMode.Create))
            {
                using (var manifest = new StreamWriter(zip.CreateEntry("META-INF/container.xml").Open()))
                    await manifest.WriteAsync("<container><rootfiles><rootfile full-path=\"score.musicxml\"/></rootfiles></container>");
                using var score = new StreamWriter(zip.CreateEntry("score.musicxml").Open());
                await score.WriteAsync(Xml);
            }
            var converter = Converter();
            var imported = await converter.ImportAsync(path);
            Assert.HasCount(1, imported.Parts);
        }
        finally
        {
            folder.Delete(true);
        }
    }

    [TestMethod]
    public async Task RejectsSilentPassagesWithActionableError()
    {
        var converter = Converter();
        for (var i = 0; i < 2; i++)
        {
            var exception = await Assert.ThrowsExactlyAsync<InvalidDataException>(() =>
                converter.RenderAudioAsync(MusicXmlScore.Parse(Xml)));
            Assert.Contains("pitched notes", exception.Message);
        }
    }

    [TestMethod]
    [DataRow("../outside.mscx")]
    [DataRow("/outside.mscx")]
    [DataRow("C:/outside.mscx")]
    [DataRow("folder\\outside.mscx")]
    public async Task RejectsMuseScoreProjectsWithExportGuidance(string entryPath)
    {
        var folder = Directory.CreateTempSubdirectory("musictools-import-test-");
        try
        {
            var path = Path.Combine(folder.FullName, "unsafe.mscz");
            using (var zip = ZipFile.Open(path, ZipArchiveMode.Create))
            {
                using var writer = new StreamWriter(zip.CreateEntry(entryPath).Open());
                await writer.WriteAsync("<museScore/>");
            }
            var converter = Converter();
            var exception = await Assert.ThrowsExactlyAsync<InvalidDataException>(() => converter.ImportAsync(path));
            Assert.Contains("File → Export → MusicXML", exception.Message);
        }
        finally
        {
            folder.Delete(true);
        }
    }

    [TestMethod]
    public async Task RejectsMissingAndUnsupportedInput()
    {
        var folder = Directory.CreateTempSubdirectory("musictools-import-test-");
        try
        {
            var converter = Converter();
            await Assert.ThrowsExactlyAsync<InvalidDataException>(() => converter.ImportAsync(Path.Combine(folder.FullName, "absent.xml")));
            var path = Path.Combine(folder.FullName, "score.pdf");
            await File.WriteAllTextAsync(path, Xml);
            await Assert.ThrowsExactlyAsync<InvalidDataException>(() => converter.ImportAsync(path));
        }
        finally
        {
            folder.Delete(true);
        }
    }
}
