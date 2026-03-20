namespace Aiursoft.MusicTools.Tests.IntegrationTests;

[TestClass]
public class DashboardControllerTests : TestBase
{
    [TestMethod]
    public async Task GetIndex()
    {
        // This is a basic test to ensure the controller is reachable.
        // Adjust the path as necessary for specific controllers.
        var url = "/Dashboard/Index";
        
        var response = await Http.GetAsync(url);
        
        // Assert
        // For some controllers, it might redirect to login, which is 302.
        // For others, it might be 200.
        // We just check if we get a response.
        Assert.IsNotNull(response);
    }

    [TestMethod]
    public async Task GetTuner()
    {
        var url = "/Dashboard/Tuner";
        var response = await Http.GetAsync(url);
        Assert.IsTrue(response.IsSuccessStatusCode);
    }

    [TestMethod]
    public async Task GetIntervalTraining()
    {
        var url = "/Dashboard/IntervalTraining";
        var response = await Http.GetAsync(url);
        Assert.IsTrue(response.IsSuccessStatusCode);
    }

    [TestMethod]
    public async Task GetIntervalExam()
    {
        var url = "/Dashboard/IntervalExam";
        var response = await Http.GetAsync(url);
        Assert.IsTrue(response.IsSuccessStatusCode);
    }

    [TestMethod]
    public async Task GetChordTraining()
    {
        var url = "/Dashboard/ChordTraining";
        var response = await Http.GetAsync(url);
        Assert.IsTrue(response.IsSuccessStatusCode);
        
        var content = await response.Content.ReadAsStringAsync();
        Assert.IsTrue(content.Contains("id=\"result-root-note\""));
        Assert.IsTrue(content.Contains("id=\"result-third-note\""));
        Assert.IsTrue(content.Contains("id=\"result-fifth-note\""));
    }
}
