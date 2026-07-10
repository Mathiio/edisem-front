import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('pageerror', (err) => console.log('[pageerror]', err.message));

await page.goto('http://localhost:5174/test/recit-artistique/19125', { waitUntil: 'domcontentloaded', timeout: 15000 });
await page.waitForTimeout(6000);
await page.screenshot({ path: '/tmp/her-reverted.png', fullPage: true });
console.log('DONE');
await browser.close();
process.exit(0);
