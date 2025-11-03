using Aiursoft.MusicTools.Models.HomeViewModels;
using Aiursoft.MusicTools.Services;
using Aiursoft.UiStack.Navigation;
using Microsoft.AspNetCore.Mvc;

namespace Aiursoft.MusicTools.Controllers;

public class HomeController : Controller
{
    public IActionResult Index()
    {
        return this.StackView(new IndexViewModel());
    }

    [RenderInNavBar(
        NavGroupName = "Features",
        NavGroupOrder = 1,
        CascadedLinksGroupName = "Home",
        CascadedLinksIcon = "home",
        CascadedLinksOrder = 1,
        LinkText = "Major Calculator",
        LinkOrder = 1)]
    public IActionResult Major()
    {
        return this.StackView(new MajorViewModel());
    }

    [RenderInNavBar(
        NavGroupName = "Features",
        NavGroupOrder = 1,
        CascadedLinksGroupName = "Home",
        CascadedLinksIcon = "home",
        CascadedLinksOrder = 1,
        LinkText = "Minor Calculator",
        LinkOrder = 1)]
    public IActionResult Minor()
    {
        return this.StackView(new MinorViewModel());
    }
}
