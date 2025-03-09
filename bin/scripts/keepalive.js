const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  for (const url of [
    "https://laclipasa.fly.dev/ui",
  ]) {
    try {
      await page.goto(url, {
        waitUntil: "networkidle",
      });
      console.log(`${url} visited and SPA content loaded.`);
    } catch (error) {
      console.log(`Failed visit to ${url}: ${error}`);
    }
  }

  await browser.close();
})();
