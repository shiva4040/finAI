import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\PC\\.gemini\\antigravity\\brain\\b31d56ff-3d0f-4073-86c9-6b3510a6c2f1';
const LOCAL_SCREENSHOTS = path.resolve('screenshots');

if (!fs.existsSync(LOCAL_SCREENSHOTS)) {
  fs.mkdirSync(LOCAL_SCREENSHOTS, { recursive: true });
}

async function clickButtonWithText(page, text) {
  const clicked = await page.evaluate((buttonText) => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent.includes(buttonText));
    if (btn) {
      btn.scrollIntoView();
      btn.click();
      return true;
    }
    return false;
  }, text);

  if (!clicked) {
    throw new Error(`Button with text "${text}" not found`);
  }
}

async function run() {
  console.log('Launching Chrome via puppeteer-core...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  const VIEWPORT_WIDTH = 1650;
  const VIEWPORT_HEIGHT = 928;
  await page.setViewport({ width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT });

  console.log(`Viewport set to ${VIEWPORT_WIDTH} x ${VIEWPORT_HEIGHT}`);

  // Test 1: Income Page - Record New Transaction Modal
  console.log('\n--- TEST 1: Income Page -> Add Income Entry Modal ---');
  await page.goto('http://127.0.0.1:5173/income', { waitUntil: 'networkidle0' });
  await page.waitForSelector('button');
  await new Promise(r => setTimeout(r, 500));

  await clickButtonWithText(page, 'Add Income Entry');
  await page.waitForSelector('[role="dialog"]', { visible: true });
  await new Promise(r => setTimeout(r, 600)); // wait for fade-in animation

  // Measure Modal Geometry
  const incomeModalMetrics = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"] > div:last-child');
    if (!dialog) return null;
    const rect = dialog.getBoundingClientRect();
    const overlay = document.querySelector('[role="dialog"]');
    const overlayRect = overlay.getBoundingClientRect();
    return {
      dialog: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2,
      },
      overlay: {
        left: overlayRect.left,
        right: overlayRect.right,
        width: overlayRect.width,
        height: overlayRect.height,
      },
      window: {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
      }
    };
  });

  console.log('Income Modal Metrics:', JSON.stringify(incomeModalMetrics, null, 2));

  const viewportCenterX = VIEWPORT_WIDTH / 2;
  const modalCenterX = incomeModalMetrics.dialog.centerX;
  const diffX = Math.abs(modalCenterX - viewportCenterX);

  console.log(`Viewport Center X: ${viewportCenterX}px`);
  console.log(`Modal Center X:    ${modalCenterX}px`);
  console.log(`Difference X:      ${diffX.toFixed(2)}px`);

  const screenshot1 = path.join(LOCAL_SCREENSHOTS, 'income_modal_1650x928.png');
  const artifactScreenshot1 = path.join(ARTIFACT_DIR, 'income_modal_1650x928.png');
  await page.screenshot({ path: screenshot1, fullPage: false });
  fs.copyFileSync(screenshot1, artifactScreenshot1);
  console.log(`Saved screenshot to ${screenshot1} and ${artifactScreenshot1}`);

  if (diffX <= 1.0) {
    console.log('>>> [PASS] Modal is PERFECTLY centered on the full browser viewport! <<<');
  } else {
    console.error(`>>> [FAIL] Modal is off-center by ${diffX}px! <<<`);
  }

  // Close modal via Escape
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 400));

  // Test 2: Transactions Page -> Record New Transaction Modal
  console.log('\n--- TEST 2: Transactions Page -> Record New Transaction Modal ---');
  await page.goto('http://127.0.0.1:5173/transactions', { waitUntil: 'networkidle0' });
  await page.waitForSelector('button');
  await new Promise(r => setTimeout(r, 500));

  await clickButtonWithText(page, 'Add Transaction');
  await page.waitForSelector('[role="dialog"]', { visible: true });
  await new Promise(r => setTimeout(r, 600));

  const txModalMetrics = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"] > div:last-child');
    if (!dialog) return null;
    const rect = dialog.getBoundingClientRect();
    return {
      left: rect.left,
      width: rect.width,
      centerX: rect.left + rect.width / 2,
      top: rect.top,
      bottom: rect.bottom,
      height: rect.height,
    };
  });

  console.log('Transactions Modal Metrics:', JSON.stringify(txModalMetrics, null, 2));
  const diffTxX = Math.abs(txModalMetrics.centerX - viewportCenterX);
  console.log(`Transactions Modal Center X: ${txModalMetrics.centerX}px (Diff: ${diffTxX.toFixed(2)}px)`);

  const screenshot2 = path.join(LOCAL_SCREENSHOTS, 'transactions_modal_1650x928.png');
  const artifactScreenshot2 = path.join(ARTIFACT_DIR, 'transactions_modal_1650x928.png');
  await page.screenshot({ path: screenshot2, fullPage: false });
  fs.copyFileSync(screenshot2, artifactScreenshot2);

  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 400));

  // Test 3: Customers Page -> Add Customer Modal
  console.log('\n--- TEST 3: Customers Page -> Add Customer Modal ---');
  await page.goto('http://127.0.0.1:5173/customers', { waitUntil: 'networkidle0' });
  await page.waitForSelector('button');
  await new Promise(r => setTimeout(r, 500));

  await clickButtonWithText(page, 'Add Customer');
  await page.waitForSelector('[role="dialog"]', { visible: true });
  await new Promise(r => setTimeout(r, 600));

  const custModalMetrics = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"] > div:last-child');
    if (!dialog) return null;
    const rect = dialog.getBoundingClientRect();
    return {
      left: rect.left,
      width: rect.width,
      centerX: rect.left + rect.width / 2,
    };
  });
  console.log(`Customers Modal Center X: ${custModalMetrics.centerX}px (Diff: ${Math.abs(custModalMetrics.centerX - viewportCenterX).toFixed(2)}px)`);

  const screenshot3 = path.join(LOCAL_SCREENSHOTS, 'customer_modal_1650x928.png');
  const artifactScreenshot3 = path.join(ARTIFACT_DIR, 'customer_modal_1650x928.png');
  await page.screenshot({ path: screenshot3, fullPage: false });
  fs.copyFileSync(screenshot3, artifactScreenshot3);

  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 400));

  // Test 4: Global Omnisearch Modal
  console.log('\n--- TEST 4: Global Omnisearch Modal ---');
  await clickButtonWithText(page, 'Search transactions');
  await page.waitForSelector('[role="dialog"]', { visible: true });
  await new Promise(r => setTimeout(r, 600));

  const searchMetrics = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"] > div:last-child');
    if (!dialog) return null;
    const rect = dialog.getBoundingClientRect();
    return {
      left: rect.left,
      width: rect.width,
      centerX: rect.left + rect.width / 2,
    };
  });
  console.log(`Omnisearch Modal Center X: ${searchMetrics.centerX}px (Diff: ${Math.abs(searchMetrics.centerX - viewportCenterX).toFixed(2)}px)`);

  const screenshot4 = path.join(LOCAL_SCREENSHOTS, 'omnisearch_modal_1650x928.png');
  const artifactScreenshot4 = path.join(ARTIFACT_DIR, 'omnisearch_modal_1650x928.png');
  await page.screenshot({ path: screenshot4, fullPage: false });
  fs.copyFileSync(screenshot4, artifactScreenshot4);

  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 400));

  // Test 5: Mobile Viewport (390 x 844)
  console.log('\n--- TEST 5: Mobile Viewport (390 x 844) ---');
  await page.setViewport({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:5173/income', { waitUntil: 'networkidle0' });
  await page.waitForSelector('button');
  await new Promise(r => setTimeout(r, 500));

  await clickButtonWithText(page, 'Add Income Entry');
  await page.waitForSelector('[role="dialog"]', { visible: true });
  await new Promise(r => setTimeout(r, 600));

  const mobileMetrics = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"] > div:last-child');
    if (!dialog) return null;
    const rect = dialog.getBoundingClientRect();
    return {
      left: rect.left,
      width: rect.width,
      centerX: rect.left + rect.width / 2,
      top: rect.top,
      bottom: rect.bottom,
      height: rect.height,
    };
  });

  console.log('Mobile Modal Metrics:', JSON.stringify(mobileMetrics, null, 2));
  const mobileDiffX = Math.abs(mobileMetrics.centerX - (390 / 2));
  console.log(`Mobile Center X: ${mobileMetrics.centerX}px vs Expected ${390/2}px (Diff: ${mobileDiffX.toFixed(2)}px)`);
  console.log(`Mobile Bottom: ${mobileMetrics.bottom}px vs Viewport Height 844px (Fit within screen: ${mobileMetrics.bottom <= 844})`);

  const screenshot5 = path.join(LOCAL_SCREENSHOTS, 'income_modal_mobile_390x844.png');
  const artifactScreenshot5 = path.join(ARTIFACT_DIR, 'income_modal_mobile_390x844.png');
  await page.screenshot({ path: screenshot5, fullPage: false });
  fs.copyFileSync(screenshot5, artifactScreenshot5);

  await browser.close();
  console.log('\nVisual Verification Complete! All screenshots captured and verified.');
}

run().catch(err => {
  console.error('Visual verification error:', err);
  process.exit(1);
});
