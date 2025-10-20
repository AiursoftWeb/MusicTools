using Aiursoft.MusicTools.Entities;
using Microsoft.EntityFrameworkCore;

namespace Aiursoft.MusicTools.Sqlite;

public class SqliteContext(DbContextOptions<SqliteContext> options) : TemplateDbContext(options)
{
    public override Task<bool> CanConnectAsync()
    {
        return Task.FromResult(true);
    }
}
