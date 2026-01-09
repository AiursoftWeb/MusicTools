using Aiursoft.MusicTools.Models.DeployViewModels;
using Aiursoft.MusicTools.Services;
using Aiursoft.UiStack.Navigation;
using Microsoft.AspNetCore.Mvc;

namespace Aiursoft.MusicTools.Controllers;

/// <summary>
/// This controller handles deployment and self-hosting documentation.
/// </summary>
public class DeployController : Controller
{
    [RenderInNavBar(
        NavGroupName = "Resources",
        NavGroupOrder = 1000,
        CascadedLinksGroupName = "Deploy",
        CascadedLinksIcon = "server",
        CascadedLinksOrder = 1,
        LinkText = "Self Host a New Server",
        LinkOrder = 1)]
    public IActionResult SelfHost()
    {
        return this.StackView(new SelfHostViewModel());
    }
}
