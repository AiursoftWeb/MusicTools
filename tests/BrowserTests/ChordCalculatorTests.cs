using static Microsoft.Playwright.Assertions;

namespace Aiursoft.MusicTools.Tests.BrowserTests;

[TestClass]
public class ChordCalculatorTests : BrowserTestBase
{
    [TestMethod]
    public async Task ChordRootCanDifferFromTonicOrBeAmbiguous()
    {
        await Page.GotoAsync("/Dashboard/ChordCalculator");
        await Page.Locator("[data-mode='diatonic-triad']").ClickAsync();
        await Page.Locator("[data-degree='5']").ClickAsync();

        var root = Page.Locator("#detected-root");
        var chord = Page.Locator("#chord-result-display");
        await Expect(Page.Locator(".current-key-display .key-name")).ToHaveTextAsync("C");
        await Expect(root).ToHaveTextAsync("G");

        foreach (var mode in new[] { "augmented", "dim7" })
        {
            await Page.Locator($"[data-mode='{mode}']").ClickAsync();
            await Expect(root).ToHaveTextAsync("These pitches alone do not determine a unique root.");
            await Expect(chord).ToHaveTextAsync(await Page.Locator("#detected-type").InnerTextAsync());
        }

        await Page.Locator("[data-mode='major']").ClickAsync();
        await Expect(root).ToHaveTextAsync("G");
        await Expect(chord).ToHaveTextAsync("G Major Triad");
    }
}
