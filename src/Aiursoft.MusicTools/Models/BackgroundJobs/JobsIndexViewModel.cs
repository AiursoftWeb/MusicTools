using Aiursoft.UiStack.Layout;

namespace Aiursoft.MusicTools.Models.BackgroundJobs;

public class JobsIndexViewModel : UiStackLayoutViewModel
{
    public IEnumerable<JobInfo> AllRecentJobs { get; init; } = [];
}
