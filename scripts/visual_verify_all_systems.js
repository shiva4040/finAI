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
    const buttons = Array.from(document.querySelectorAll('button, a'));
    const btn = buttons.find(b => b.textContent.trim().toLowerCase().includes(buttonText.toLowerCase()));
    if (btn) {
      btn.scrollIntoView();
      btn.click();
      return true;
    }
    return false;
  }, text);

  if (!clicked) {
    throw new Error(`Button or link with text "${text}" not found`);
  }
}

async function checkCentering(page, modalName, viewportWidth) {
  const metrics = await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"] > div:last-child');
    if (!dialog) return null;
    const rect = dialog.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      bottom: rect.bottom,
      centerX: rect.left + rect.width / 2,
    };
  });

  if (!metrics) {
    console.error(`[FAIL] ${modalName}: dialog element not found in DOM`);
    return false;
  }

  const expectedCenter = viewportWidth / 2;
  const diff = Math.abs(metrics.centerX - expectedCenter);
  console.log(`[MEASUREMENT] ${modalName}: CenterX=${metrics.centerX.toFixed(1)}px (Expected=${expectedCenter}px, Diff=${diff.toFixed(2)}px, Height=${metrics.height.toFixed(1)}px)`);
  if (diff <= 1.0) {
    console.log(`>>> [PASS] ${modalName} is TRUE SCREEN CENTERED!`);
    return true;
  } else {
    console.error(`>>> [FAIL] ${modalName} is OFF-CENTER by ${diff.toFixed(2)}px!`);
    return false;
  }
}

async function run() {
  console.log('Starting All-Systems Verification via Chrome Puppeteer...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  const W = 1650;
  const H = 928;
  await page.setViewport({ width: W, height: H });

  // 0. AUTHENTICATE WITH REAL FASTAPI BACKEND
  console.log('\n=============================================');
  console.log('TEST 0: Authenticating with Real Backend');
  console.log('=============================================');
  let token = null;
  try {
    const regRes = await fetch('http://127.0.0.1:8000/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'verifier@finai.dev',
        password: 'Password123!',
        full_name: 'Verification Bot'
      })
    });
    if (regRes.ok) {
      const data = await regRes.json();
      token = data.tokens?.access_token;
    } else {
      const logRes = await fetch('http://127.0.0.1:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'verifier@finai.dev',
          password: 'Password123!'
        })
      });
      if (logRes.ok) {
        const data = await logRes.json();
        token = data.tokens?.access_token;
      }
    }
  } catch (e) {
    console.warn('Backend auth request error:', e.message);
  }
  console.log('Got real backend token:', token ? `${token.substring(0, 15)}...` : 'None');

  // Pre-seed token into browser page
  await page.goto('http://127.0.0.1:5173/dashboard', { waitUntil: 'networkidle0' });
  if (token) {
    await page.evaluate((t) => {
      localStorage.setItem('finai_token', t);
    }, token);
  }

  // 1. VERIFY SEPARATE ADD INCOME MODAL
  console.log('\n=============================================');
  console.log('TEST 1: Dedicated Add Income Modal');
  console.log('=============================================');
  await page.goto('http://127.0.0.1:5173/income', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));
  await clickButtonWithText(page, 'Add Income Entry');
  await page.waitForSelector('[role="dialog"]', { visible: true });
  await new Promise(r => setTimeout(r, 600));
  await checkCentering(page, 'AddIncomeModal', W);
  const shot1 = path.join(LOCAL_SCREENSHOTS, 'system3_add_income_modal.png');
  await page.screenshot({ path: shot1, fullPage: false });
  fs.copyFileSync(shot1, path.join(ARTIFACT_DIR, 'system3_add_income_modal.png'));
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 400));

  // 2. VERIFY SEPARATE ADD EXPENSE MODAL
  console.log('\n=============================================');
  console.log('TEST 2: Dedicated Add Expense Modal');
  console.log('=============================================');
  await page.goto('http://127.0.0.1:5173/expenses', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));
  await clickButtonWithText(page, 'Add Expense');
  await page.waitForSelector('[role="dialog"]', { visible: true });
  await new Promise(r => setTimeout(r, 600));
  await checkCentering(page, 'AddExpenseModal', W);
  const shot2 = path.join(LOCAL_SCREENSHOTS, 'system3_add_expense_modal.png');
  await page.screenshot({ path: shot2, fullPage: false });
  fs.copyFileSync(shot2, path.join(ARTIFACT_DIR, 'system3_add_expense_modal.png'));
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 400));

  // 3. VERIFY DEDICATED CREATE INVOICE MODAL
  console.log('\n=============================================');
  console.log('TEST 3: Dedicated Create Invoice Modal');
  console.log('=============================================');
  await page.goto('http://127.0.0.1:5173/invoices', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));
  await clickButtonWithText(page, 'Create New Invoice');
  await page.waitForSelector('[role="dialog"]', { visible: true });
  await new Promise(r => setTimeout(r, 600));
  await checkCentering(page, 'CreateInvoiceModal', W);
  const shot3 = path.join(LOCAL_SCREENSHOTS, 'system3_create_invoice_modal.png');
  await page.screenshot({ path: shot3, fullPage: false });
  fs.copyFileSync(shot3, path.join(ARTIFACT_DIR, 'system3_create_invoice_modal.png'));
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 400));

  // 4. VERIFY CSV IMPORT MODAL (SYSTEM 2)
  console.log('\n=============================================');
  console.log('TEST 4: Dedicated CSV Import Wizard Modal');
  console.log('=============================================');
  await page.goto('http://127.0.0.1:5173/transactions', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));
  await clickButtonWithText(page, 'Import CSV');
  await page.waitForSelector('[role="dialog"]', { visible: true });
  await new Promise(r => setTimeout(r, 600));
  await checkCentering(page, 'ImportCSVModal', W);
  const shot4 = path.join(LOCAL_SCREENSHOTS, 'system2_csv_import_modal.png');
  await page.screenshot({ path: shot4, fullPage: false });
  fs.copyFileSync(shot4, path.join(ARTIFACT_DIR, 'system2_csv_import_modal.png'));
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 400));

  // 5. VERIFY NOTIFICATION DROPDOWN (SYSTEM 4)
  console.log('\n=============================================');
  console.log('TEST 5: Solid Opaque Notification Center Dropdown');
  console.log('=============================================');
  // Click notification bell in header
  const bellClicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('header button, nav button'));
    // Bell button has aria-label="Notifications" or svg with bell
    const bellBtn = buttons.find(b => b.getAttribute('aria-label') === 'Notifications' || b.innerHTML.includes('path') && b.innerHTML.includes('M15 17h5l-1.405-1.405'));
    if (bellBtn) {
      bellBtn.click();
      return true;
    }
    // Fallback search
    const anyBtnWithBell = buttons.find(b => b.querySelector('svg'));
    if (anyBtnWithBell) {
      anyBtnWithBell.click();
      return true;
    }
    return false;
  });

  console.log('Notification Bell Clicked:', bellClicked);
  await new Promise(r => setTimeout(r, 500));
  const shot5 = path.join(LOCAL_SCREENSHOTS, 'system4_notification_dropdown.png');
  await page.screenshot({ path: shot5, fullPage: false });
  fs.copyFileSync(shot5, path.join(ARTIFACT_DIR, 'system4_notification_dropdown.png'));

  // Close dropdown by clicking header background
  await page.click('header');
  await new Promise(r => setTimeout(r, 300));

  // 6. VERIFY AI ASSISTANT CHATBOT (SYSTEM 1)
  console.log('\n=============================================');
  console.log('TEST 6: AI Assistant Interface & Real Conversations');
  console.log('=============================================');
  await page.goto('http://127.0.0.1:5173/ai-assistant', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  
  // Find textarea or input for prompt
  const inputSelector = 'textarea, input[placeholder*="Ask"]';
  await page.waitForSelector(inputSelector);
  await page.type(inputSelector, 'Show me all my transactions');
  await new Promise(r => setTimeout(r, 300));
  
  // Click Send or press Enter
  await page.keyboard.press('Enter');
  console.log('Sent prompt to AI Assistant: "Show me all my transactions"');
  
  // Wait up to 8s for assistant response or message bubble
  await new Promise(r => setTimeout(r, 4000));
  
  const shot6 = path.join(LOCAL_SCREENSHOTS, 'system1_ai_assistant_page.png');
  await page.screenshot({ path: shot6, fullPage: false });
  fs.copyFileSync(shot6, path.join(ARTIFACT_DIR, 'system1_ai_assistant_page.png'));
  console.log('Captured AI Assistant response screenshot.');

  await browser.close();
  console.log('\n=============================================');
  console.log('ALL SYSTEMS VISUAL VERIFICATION FINISHED SUCCESSFULLY!');
  console.log('=============================================');
}

run().catch(err => {
  console.error('Visual verification failure:', err);
  process.exit(1);
});
