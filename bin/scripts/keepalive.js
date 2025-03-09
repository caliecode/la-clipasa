const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  for (const url of [
    "https://la-clipasa.fly.dev/ui",
    "https://laclipasa.fly.dev/api",
  ]) {
    try {
      await page.goto(url, {
        waitUntil: "networkidle0",
      });
      console.log(`${url} visited and SPA content loaded.`);
    } catch (error) {
      console.log(`Failed visit to ${url}: ${error}`);
    }
  }
  await browser.close();
})();
