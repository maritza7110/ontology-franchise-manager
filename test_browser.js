const { chromium } = require('playwright');

(async () => {
  try {
    console.log('Launching browser...');
    const browser = await chromium.launch();
    const page = await browser.newPage();
    console.log('Navigating to google.com...');
    await page.goto('https://www.google.com');
    console.log('Taking screenshot...');
    await page.screenshot({ path: 'screenshot.png' });
    await browser.close();
    console.log('Success!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
