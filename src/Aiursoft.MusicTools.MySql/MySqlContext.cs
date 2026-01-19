using System.Diagnostics.CodeAnalysis;
using Aiursoft.MusicTools.Entities;
using Microsoft.EntityFrameworkCore;

namespace Aiursoft.MusicTools.MySql;

[ExcludeFromCodeCoverage]

public class MySqlContext(DbContextOptions<MySqlContext> options) : MusicToolsDbContext(options);
