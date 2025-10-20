using Aiursoft.MusicTools.Entities;
using Microsoft.EntityFrameworkCore;

namespace Aiursoft.MusicTools.MySql;

public class MySqlContext(DbContextOptions<MySqlContext> options) : TemplateDbContext(options);
