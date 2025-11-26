const { chromium } = require('playwright');

(async () => {
    try {
        console.log('Starting Playwright test...');
        console.log('Launching browser...');

        const browser = await chromium.launch({ headless: true });
        console.log('Browser launched successfully!');

        const page = await browser.newPage();
        console.log('New page created.');

        console.log('Navigating to Google...');
        await page.goto('https://google.com', { timeout: 30000 });
        console.log('Navigation successful!');

        console.log('Taking screenshot...');
        await page.screenshot({ path: 'test.png' });
        console.log('Screenshot saved as test.png');

        await browser.close();
        console.log('Browser closed. Test completed successfully!');

    } catch (error) {
        console.error('ERROR during Playwright test:');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        process.exit(1);
    }
})();
