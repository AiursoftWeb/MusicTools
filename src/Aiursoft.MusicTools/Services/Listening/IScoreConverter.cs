namespace Aiursoft.MusicTools.Services.Listening;

public interface IScoreConverter
{
    Task<MusicXmlScore> ImportAsync(string path, CancellationToken cancellationToken = default);
    Task<byte[]> RenderAudioAsync(MusicXmlScore score, CancellationToken cancellationToken = default);
}
