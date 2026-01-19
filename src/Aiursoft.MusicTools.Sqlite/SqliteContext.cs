using System.Diagnostics.CodeAnalysis;
using Aiursoft.MusicTools.Entities;
using Microsoft.EntityFrameworkCore;

namespace Aiursoft.MusicTools.Sqlite;

[ExcludeFromCodeCoverage]

public class SqliteContext(DbContextOptions<SqliteContext> options) : MusicToolsDbContext(options)
{
    public override Task<bool> CanConnectAsync()
    {
        return Task.FromResult(true);
    }
}
