using Aiursoft.MusicTools.Entities;
using Microsoft.EntityFrameworkCore;

namespace Aiursoft.MusicTools.InMemory;

public class InMemoryContext(DbContextOptions<InMemoryContext> options) : MusicToolsDbContext(options)
{
    public override Task MigrateAsync(CancellationToken cancellationToken)
    {
        return Database.EnsureCreatedAsync(cancellationToken);
    }

    public override Task<bool> CanConnectAsync()
    {
        return Task.FromResult(true);
    }
}
