using Aiursoft.DbTools;
using Aiursoft.MusicTools.Entities;
using static Aiursoft.WebTools.Extends;

namespace Aiursoft.MusicTools;

public abstract class Program
{
    public static async Task Main(string[] args)
    {
        var app = await AppAsync<Startup>(args);
        await app.UpdateDbAsync<TemplateDbContext>();
        await app.SeedAsync();
        await app.CopyAvatarFileAsync();
        await app.RunAsync();
    }
}
