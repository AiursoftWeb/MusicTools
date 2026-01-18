using System.ComponentModel.DataAnnotations;

namespace Aiursoft.MusicTools.Models.ManageViewModels;

public class SwitchThemeViewModel
{
    [Required]
    public required string Theme { get; set; }
}
