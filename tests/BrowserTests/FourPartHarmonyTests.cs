using static Microsoft.Playwright.Assertions;

namespace Aiursoft.MusicTools.Tests.BrowserTests;

[TestClass]
public class FourPartHarmonyTests : BrowserTestBase
{
    [TestMethod]
    public async Task MinorKeyScoreCanBeReadAndReviewedOnAPhone()
    {
        await Page.SetViewportSizeAsync(390, 844);
        await Page.GotoAsync("/Dashboard/FourPartHarmony");
        await Page.Locator("#harmony-key").SelectOptionAsync("Dm");
        await Page.Locator("#btn-start").ClickAsync();
        var options = Page.Locator(".choose-option");
        var score = Page.Locator(".harmony-score").First;
        await Expect(options.First).ToBeEnabledAsync(new() { Timeout = 30_000 });
        await Expect(score.Locator(".vf-notehead")).ToHaveCountAsync(18);
        Assert.IsTrue(await score.EvaluateAsync<bool>("s => s.scrollWidth <= s.clientWidth + 1"));

        await score.ClickAsync();
        await Expect(options.First).ToBeEnabledAsync();
        await options.First.ClickAsync();
        var solution = Page.Locator(".option-card.border-success");
        await Expect(solution.Locator(".vf-notehead")).ToHaveCountAsync(36);
        await Expect(Page.Locator("#btn-play-harmony")).ToBeEnabledAsync();
        await Page.Locator("#btn-play-harmony").ClickAsync();
        await Expect(Page.Locator("#play-count-text")).ToHaveTextAsync("1 / 3");
        await Page.Locator("#btn-next").ClickAsync();
        await Expect(options.First).ToBeEnabledAsync();
        await Expect(solution).ToHaveCountAsync(0);
        await Page.Locator("#btn-settings").ClickAsync();
        await Expect(Page.Locator("#harmony-key")).ToBeVisibleAsync();
    }
}
