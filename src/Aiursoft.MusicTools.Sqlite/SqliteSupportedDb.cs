using Aiursoft.DbTools;
using Aiursoft.DbTools.Sqlite;
using Aiursoft.MusicTools.Entities;
using Microsoft.Extensions.DependencyInjection;

namespace Aiursoft.MusicTools.Sqlite;

public class SqliteSupportedDb(bool allowCache, bool splitQuery) : SupportedDatabaseType<TemplateDbContext>
{
    public override string DbType => "Sqlite";

    public override IServiceCollection RegisterFunction(IServiceCollection services, string connectionString)
    {
        return services.AddAiurSqliteWithCache<SqliteContext>(
            connectionString,
            splitQuery: splitQuery,
            allowCache: allowCache);
    }

    public override TemplateDbContext ContextResolver(IServiceProvider serviceProvider)
    {
        return serviceProvider.GetRequiredService<SqliteContext>();
    }
}
