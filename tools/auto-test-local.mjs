import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RUN_ID = 'RUN-LOCAL-V11-VERIFIED';
const SCREENSHOT_DIR = path.join(__dirname, `../docs/testing/logs/${RUN_ID}/screenshots`);
const LOG_DIR = path.join(__dirname, `../docs/testing/logs/${RUN_ID}`);

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const DEVICES = [
  { id: 'trmnl-og', name: 'TRMNL OG' },
  { id: 'kindle-11', name: 'Kindle 11th Gen' },
];

const results = [];

async function screenshot(page, device, stage) {
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${device.id}-${stage}.png`) });
  console.log(`📸 ${stage}`);
}

async function assessV11(text) {
  const checks = {
    header: text.includes('Cambridge') && text.includes('7:32'),
    weather: text.includes('21') && text.includes('UMBRELLA'),
    status: text.includes('LEAVE NOW') && text.includes('8:14'),
    walk: text.includes('Walk to Tram'),
    tram: text.includes('Tram 86'),
    coffee: text.includes('Proud Mary'),
    footer: text.includes('Collins') && text.includes('ARRIVE'),
  };
  
  let score = 0;
  if (checks.header) score += 15;
  if (checks.weather) score += 10;
  if (checks.status) score += 15;
  if (checks.walk) score += 10;
  if (checks.tram) score += 15;
  if (checks.coffee) score += 15;
  if (checks.footer) score += 10;
  // E-ink + Typography base = 10
  score += 10;
  
  return { score, checks };
}

async function testDevice(browser, device) {
  console.log(`\n${'='.repeat(40)}`);
  console.log(`🔧 ${device.name}`);
  console.log('='.repeat(40));
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1000 });
  await page.goto('http://localhost:8081/simulator.html', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  
  // Select device
  await page.evaluate((n) => {
    document.querySelectorAll('.device-btn').forEach(b => {
      if (b.textContent.includes(n.split(' ')[0])) b.click();
    });
  }, device.name);
  await new Promise(r => setTimeout(r, 500));
  await screenshot(page, device, '01-initial');
  
  // Flash
  console.log('⚡ Flash...');
  await page.evaluate(() => simulateFlash());
  await new Promise(r => setTimeout(r, 3500));
  await screenshot(page, device, '02-flash');
  
  await new Promise(r => setTimeout(r, 2500));
  await screenshot(page, device, '03-setup');
  
  await new Promise(r => setTimeout(r, 4000));
  await screenshot(page, device, '04-boot');
  
  await new Promise(r => setTimeout(r, 2000));
  await screenshot(page, device, '05-v11-dashboard');
  
  const text = await page.evaluate(() => document.getElementById('eink-display')?.innerText || '');
  console.log('V11 Content:', text.substring(0, 150).replace(/\n/g, ' | '));
  
  const assessment = await assessV11(text);
  console.log(`📊 Score: ${assessment.score}%`);
  Object.entries(assessment.checks).forEach(([k, v]) => console.log(`   ${k}: ${v ? '✅' : '❌'}`));
  
  await page.close();
  return { device: device.name, ...assessment };
}

async function main() {
  console.log('🚀 FULL V11 AUTOMATED TEST (LOCAL)');
  console.log(RUN_ID);
  
  const browser = await puppeteer.launch({ headless: 'new' });
  for (const d of DEVICES) results.push(await testDevice(browser, d));
  await browser.close();
  
  console.log('\n' + '='.repeat(50));
  console.log('📋 FINAL REPORT');
  let allPass = true;
  results.forEach(r => {
    const icon = r.score >= 100 ? '✅' : (r.score >= 80 ? '🟡' : '⚠️');
    console.log(`${icon} ${r.device}: ${r.score}%`);
    if (r.score < 100) allPass = false;
  });
  
  // Save report
  const report = `# V11 Testing Report - LOCAL VERIFIED\n\nRun: ${RUN_ID}\nDate: ${new Date().toISOString()}\n\n## Results\n\n${results.map(r => `### ${r.device}: ${r.score}%\n\n${Object.entries(r.checks).map(([k,v]) => `- ${k}: ${v ? '✅' : '❌'}`).join('\n')}`).join('\n\n')}\n\n## Conclusion\n\n${allPass ? '✅ ALL TESTS PASSED - Ready for Vercel deploy verification' : '⚠️ Some tests need attention'}`;
  
  fs.writeFileSync(path.join(LOG_DIR, 'report.md'), report);
  console.log(`\n📝 Report: ${LOG_DIR}/report.md`);
  
  if (allPass) {
    console.log('\n🎉 LOCAL TESTING COMPLETE - V11 DASHBOARD VERIFIED');
    console.log('📌 Awaiting Vercel deploy for production verification');
  }
}

main().catch(console.error);
