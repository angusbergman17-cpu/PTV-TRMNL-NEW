import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RUN_ID = 'RUN-20260128-FULL';
const SCREENSHOT_DIR = path.join(__dirname, `../docs/testing/logs/${RUN_ID}/screenshots`);
const LOG_DIR = path.join(__dirname, `../docs/testing/logs/${RUN_ID}`);

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

async function main() {
  console.log('🚀 FULL CAPTURE TEST - All stages');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1000 });
  await page.goto('https://ptvtrmnl.vercel.app/simulator.html', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  
  console.log('⚡ Flash...');
  await page.evaluate(() => simulateFlash());
  
  // Capture at key intervals
  const captures = [];
  for (let i = 0; i <= 30; i++) {
    await new Promise(r => setTimeout(r, 500));
    const text = await page.evaluate(() => document.getElementById('eink-display')?.innerText || '');
    const sample = text.substring(0, 80).replace(/\n/g, ' | ');
    
    const stage = 
      text.includes('Flash') ? 'FLASH' :
      text.includes('HOME ADDRESS') || text.includes('Setup') ? 'SETUP' :
      text.includes('INITIALIZING') || text.includes('WiFi') ? 'BOOT' :
      text.includes('LEAVE NOW') || text.includes('Walk to') ? 'V11-JOURNEY' :
      text.includes('Ready') ? 'READY' : 'OTHER';
    
    if (i % 2 === 0 || stage === 'V11-JOURNEY') {
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${String(i).padStart(2,'0')}-${i*0.5}s-${stage}.png`) });
      console.log(`${(i*0.5).toFixed(1)}s: [${stage}] ${sample}`);
      captures.push({ time: i*0.5, stage, sample });
    }
    
    if (stage === 'V11-JOURNEY') {
      console.log('\n✅ V11 JOURNEY DASHBOARD FOUND!');
      console.log('Full content:');
      console.log(text);
      fs.writeFileSync(path.join(LOG_DIR, 'v11-content.txt'), text);
      break;
    }
  }
  
  await browser.close();
  
  // Summary
  console.log('\n📊 CAPTURE SUMMARY:');
  captures.forEach(c => console.log(`  ${c.time}s: ${c.stage}`));
  
  const hasV11 = captures.some(c => c.stage === 'V11-JOURNEY');
  console.log(`\n${hasV11 ? '✅ SUCCESS: V11 Journey captured!' : '⚠️ V11 Journey not captured'}`);
}

main().catch(console.error);
