const { chromium } = require('playwright');
const path = require('path');

(async () => {
    console.log('Starting E2E Test...');
    const browser = await chromium.launch(); // Headless by default
    const page = await browser.newPage();

    // Capture browser console logs
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err));

    try {
        // 1. Go to localhost:3000
        console.log('Navigating to app...');
        await page.goto('http://localhost:3000');

        // 2. Verify Title
        const title = await page.title();
        console.log(`Page Title: ${title}`);
        if (!title.includes('Ontology Franchise Manager')) {
            throw new Error('Title mismatch');
        }

        // 3. Upload File
        console.log('Uploading file...');
        const fileInput = await page.$('input[type=file]');
        await fileInput.setInputFiles(path.join(__dirname, 'test_data.txt'));

        // Wait for upload processing (look for success message)
        console.log('Waiting for upload status update...');
        // Wait until the status div has text containing "Success"
        await page.waitForFunction(
            () => {
                const el = document.querySelector('#upload-status');
                return el && el.textContent.includes('Success');
            },
            null,
            { timeout: 10000 }
        );

        const statusText = await page.textContent('#upload-status');
        console.log(`Upload Status: ${statusText}`);

        // 4. Verify Dashboard Update
        // Wait for dashboard to refresh (simple wait)
        await page.waitForTimeout(2000);

        const totalFranchises = await page.textContent('#total-franchises');
        console.log(`Total Franchises: ${totalFranchises}`);

        if (parseInt(totalFranchises) === 0) {
            throw new Error('Dashboard did not update');
        }

        // 5. Verify Tabs
        console.log('Checking Franchise Tab...');
        await page.click('button[data-tab="franchise"]');

        // Wait for list items to appear
        await page.waitForSelector('#franchise-list li', { timeout: 5000 });

        const franchiseList = await page.textContent('#franchise-list');
        console.log(`Franchise List Content: ${franchiseList.substring(0, 50)}...`);

        if (!franchiseList.includes('강남점')) {
            throw new Error('Franchise data missing');
        }

        console.log('Taking screenshot...');
        await page.screenshot({ path: 'e2e_result.png', fullPage: true });

        console.log('E2E Test Passed!');

    } catch (error) {
        console.error('E2E Test Failed:', error);
        await page.screenshot({ path: 'e2e_error.png' });
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
