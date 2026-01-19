using Aiursoft.MusicTools.Models.DeployViewModels;
using Aiursoft.MusicTools.Models.HomeViewModels;
using Aiursoft.MusicTools.Services;
using Aiursoft.WebTools.Attributes;
using Microsoft.AspNetCore.Mvc;

namespace Aiursoft.MusicTools.Controllers;

[LimitPerMin]
public class HomeController : Controller
{
    public IActionResult Index()
    {
        return this.SimpleView(new IndexViewModel());
    }

    public IActionResult SelfHost()
    {
        return this.SimpleView(new SelfHostViewModel());
    }
}
