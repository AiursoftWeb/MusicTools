using Aiursoft.DbTools;
using Aiursoft.DbTools.InMemory;
using Aiursoft.MusicTools.Entities;
using Microsoft.Extensions.DependencyInjection;

namespace Aiursoft.MusicTools.InMemory;

public class InMemorySupportedDb : SupportedDatabaseType<MusicToolsDbContext>
{
    public override string DbType => "InMemory";

    public override IServiceCollection RegisterFunction(IServiceCollection services, string connectionString)
    {
        return services.AddAiurInMemoryDb<InMemoryContext>();
    }

    public override MusicToolsDbContext ContextResolver(IServiceProvider serviceProvider)
    {
        return serviceProvider.GetRequiredService<InMemoryContext>();
    }
}
