import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = path.join(__dirname, '../docs/testing/logs/RUN-20260128-0841/screenshots');

async function takeScreenshot(url, filename) {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 900 });
  console.log('Navigating to:', url);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));
  
  const filepath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: false });
  console.log('Screenshot saved:', filepath);
  await browser.close();
  return filepath;
}

const stage = process.argv[2] || 'initial';
const device = process.argv[3] || 'trmnl-og';
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const filename = `${device}-${stage}-${timestamp}.png`;

takeScreenshot('https://ptvtrmnl.vercel.app/simulator.html', filename).catch(console.error);
