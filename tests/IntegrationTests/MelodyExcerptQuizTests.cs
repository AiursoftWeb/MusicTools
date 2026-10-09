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

        Assert.Contains("The stage is being prepared", html);
        Assert.Contains("listeningPractice.js", html);
        Assert.DoesNotContain("id=\"question-picker\"", html);
    }
}
