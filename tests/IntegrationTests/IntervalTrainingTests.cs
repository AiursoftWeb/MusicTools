namespace Aiursoft.MusicTools.Tests.IntegrationTests;

[TestClass]
public class IntervalTrainingTests : TestBase
{
    [TestMethod]
    public async Task TestIntervalTrainingDuplicatesRemoved()
    {
        var url = "/Dashboard/IntervalTraining";
        var response = await Http.GetAsync(url);
        response.EnsureSuccessStatusCode();
        var html = await response.Content.ReadAsStringAsync();

        // Should contain Augmented Fourth and Minor Sixth
        Assert.IsTrue(html.Contains("data-key=\"int-a4\""));
        Assert.IsTrue(html.Contains("data-key=\"int-m6\""));

        // Should NOT contain Diminished Fifth and Augmented Fifth
        Assert.IsFalse(html.Contains("data-key=\"int-d5\""));
        Assert.IsFalse(html.Contains("data-key=\"int-a5\""));
    }
}
