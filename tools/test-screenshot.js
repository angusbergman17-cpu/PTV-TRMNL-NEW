const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = path.join(__dirname, '../docs/testing/logs/RUN-20260128-0841/screenshots');

async function takeScreenshot(url, filename, selector = null) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 900 });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000)); // Wait for render
  
  const filepath = path.join(SCREENSHOT_DIR, filename);
  if (selector) {
    const element = await page.$(selector);
    if (element) await element.screenshot({ path: filepath });
  } else {
    await page.screenshot({ path: filepath, fullPage: false });
  }
  console.log('Screenshot saved:', filepath);
  await browser.close();
  return filepath;
}

async function main() {
  const stage = process.argv[2] || 'initial';
  const device = process.argv[3] || 'trmnl-og';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `${device}-${stage}-${timestamp}.png`;
  
  await takeScreenshot('https://ptvtrmnl.vercel.app/simulator.html', filename);
}

main().catch(console.error);
