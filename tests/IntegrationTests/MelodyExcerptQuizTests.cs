namespace Aiursoft.MusicTools.Tests.IntegrationTests;

[TestClass]
public class MelodyExcerptQuizTests : TestBase
{
    [TestMethod]
    public async Task TestMelodyExcerptQuizRendering()
    {
        var url = "/Dashboard/MelodyExcerptQuiz";
        var response = await Http.GetAsync(url);
        response.EnsureSuccessStatusCode();
        var html = await response.Content.ReadAsStringAsync();

        // Should contain key game elements
        Assert.IsTrue(html.Contains("id=\"start-overlay\""));
        Assert.IsTrue(html.Contains("id=\"game-board\""));
        Assert.IsTrue(html.Contains("id=\"option-0\""));
        Assert.IsTrue(html.Contains("id=\"option-1\""));
        Assert.IsTrue(html.Contains("id=\"option-2\""));
        Assert.IsTrue(html.Contains("id=\"option-3\""));
        Assert.IsTrue(html.Contains("melodyExcerptQuiz.js"));
    }
}
