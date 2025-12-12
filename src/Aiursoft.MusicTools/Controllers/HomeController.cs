using Aiursoft.MusicTools.Models.HomeViewModels;
using Aiursoft.MusicTools.Services;
using Aiursoft.UiStack.Navigation;
using Aiursoft.WebTools.Attributes;
using Microsoft.AspNetCore.Mvc;

namespace Aiursoft.MusicTools.Controllers;

[LimitPerMin]
public class HomeController : Controller
{
    public IActionResult Index()
    {
        return this.StackView(new IndexViewModel());
    }

    [RenderInNavBar(
        NavGroupName = "Tools",
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
        NavGroupName = "Tools",
        NavGroupOrder = 1,
        CascadedLinksGroupName = "Home",
        CascadedLinksIcon = "home",
        CascadedLinksOrder = 1,
        LinkText = "Minor Calculator",
        LinkOrder = 2)]
    public IActionResult Minor()
    {
        return this.StackView(new MinorViewModel());
    }

    [RenderInNavBar(
        NavGroupName = "Tools",
        NavGroupOrder = 1,
        CascadedLinksGroupName = "Home",
        CascadedLinksIcon = "home",
        CascadedLinksOrder = 1,
        LinkText = "Interval Calculator",
        LinkOrder = 3)]
    public IActionResult Interval()
    {
        return this.StackView(new IntervalViewModel());
    }

    [RenderInNavBar(
        NavGroupName = "Tools",
        NavGroupOrder = 1,
        CascadedLinksGroupName = "Tests",
        CascadedLinksIcon = "headphones",
        CascadedLinksOrder = 2,
        LinkText = "Interval test",
        LinkOrder = 4)]
    public IActionResult IntervalExam()
    {
        return this.StackView(new IntervalExamViewModel());
    }

    [RenderInNavBar(
        NavGroupName = "Tools",
        NavGroupOrder = 1,
        CascadedLinksGroupName = "Home",
        CascadedLinksIcon = "home",
        CascadedLinksOrder = 1,
        LinkText = "Metronome",
        LinkOrder = 5)]
    public IActionResult Metronome()
    {
        return this.StackView(new MetronomeViewModel());
    }
    [RenderInNavBar(
        NavGroupName = "Tools",
        NavGroupOrder = 1,
        CascadedLinksGroupName = "Tests",
        CascadedLinksIcon = "headphones",
        CascadedLinksOrder = 2,
        LinkText = "Melody Memory Test",
        LinkOrder = 6)]
    public IActionResult MelodyMemory()
    {
        return this.StackView(new MelodyMemoryViewModel());
    }
}
