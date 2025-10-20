using Aiursoft.UiStack.Layout;

namespace Aiursoft.MusicTools.Models.ErrorViewModels;

public class ErrorViewModel: UiStackLayoutViewModel
{
    public ErrorViewModel()
    {
        PageTitle = "Error";
    }

    public required string RequestId { get; set; }

    public bool ShowRequestId => !string.IsNullOrEmpty(RequestId);
}
