namespace Aiursoft.MusicTools.Tests.IntegrationTests;

[TestClass]
public class HomeControllerTests : TestBase
{
    [TestMethod]
    public async Task GetIndex()
    {
        var url = "/";
        var response = await Http.GetAsync(url);
        response.EnsureSuccessStatusCode();
        var content = await response.Content.ReadAsStringAsync();
        StringAssert.Contains(content, "Free & Open Source");
    }

    [TestMethod]
    public async Task GetSelfHost()
    {
        var url = "/Home/SelfHost";
        var response = await Http.GetAsync(url);
        response.EnsureSuccessStatusCode();
        var content = await response.Content.ReadAsStringAsync();
        StringAssert.Contains(content, "Deploy");
        StringAssert.Contains(content, "Anywhere");
        StringAssert.Contains(content, "docker pull $image");
    }
}
