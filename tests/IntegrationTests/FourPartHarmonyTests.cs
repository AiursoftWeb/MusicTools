namespace Aiursoft.MusicTools.Tests.IntegrationTests;

[TestClass]
public class FourPartHarmonyTests : TestBase
{
    [TestMethod]
    public async Task TestFourPartHarmonyRendering()
    {
        var url = "/Dashboard/FourPartHarmony";
        var response = await Http.GetAsync(url);
        response.EnsureSuccessStatusCode();
        var html = await response.Content.ReadAsStringAsync();

        // Should contain key game elements
        Assert.IsTrue(html.Contains("id=\"start-overlay\""));
        Assert.IsTrue(html.Contains("id=\"game-board\""));
        Assert.IsTrue(html.Contains("id=\"timer-text\""));
        Assert.IsTrue(html.Contains("id=\"play-count-text\""));
        Assert.IsTrue(html.Contains("id=\"soprano-staff-0\""));
        Assert.IsTrue(html.Contains("id=\"bass-staff-0\""));
        Assert.IsTrue(html.Contains("fourPartHarmony.js"));
    }
}
