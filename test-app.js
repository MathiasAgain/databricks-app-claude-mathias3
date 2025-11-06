const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Opening app at http://localhost:5179...');
  await page.goto('http://localhost:5179');
  await page.waitForLoadState('networkidle');

  console.log('Taking initial screenshot...');
  await page.screenshot({ path: 'screenshot-1-initial.png', fullPage: true });

  console.log('Waiting for suggested questions to load...');
  await page.waitForSelector('text=Suggested Questions', { timeout: 5000 });

  console.log('Clicking first suggested question...');
  const firstQuestion = page.locator('button').filter({ hasText: 'Show top 10 products' }).first();
  await firstQuestion.click();

  console.log('Waiting for query to complete...');
  await page.waitForTimeout(20000); // Wait 20 seconds for Genie query

  console.log('Taking screenshot after query...');
  await page.screenshot({ path: 'screenshot-2-after-query.png', fullPage: true });

  console.log('Done! Check screenshot-1-initial.png and screenshot-2-after-query.png');

  await browser.close();
})();
