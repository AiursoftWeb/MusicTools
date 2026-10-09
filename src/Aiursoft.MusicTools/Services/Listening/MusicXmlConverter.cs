using Aiursoft.Scanner.Abstractions;

namespace Aiursoft.MusicTools.Services.Listening;

/// <summary>Managed MusicXML import and playback preparation. No native applications are required.</summary>
public sealed class MusicXmlConverter : IScoreConverter, ISingletonDependency
{
    public async Task<MusicXmlScore> ImportAsync(string path, CancellationToken cancellationToken = default)
    {
        var input = new FileInfo(path);
        if (!input.Exists || input.Length is <= 0 or > 20 * 1024 * 1024)
            throw new InvalidDataException("Upload a non-empty score no larger than 20 MB.");
        switch (input.Extension.ToLowerInvariant())
        {
            case ".musicxml":
            case ".xml":
                return MusicXmlScore.Parse(await File.ReadAllTextAsync(path, cancellationToken));
            case ".mxl":
                await using (var stream = File.OpenRead(path)) return MusicXmlScore.ReadCompressed(stream);
            default:
                throw new InvalidDataException("Upload MusicXML (.musicxml, .xml or .mxl). In MuseScore, use File → Export → MusicXML.");
        }
    }

    public Task<byte[]> RenderAudioAsync(MusicXmlScore score, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        return Task.FromResult(MusicXmlPlayback.Serialize(score));
    }
}
