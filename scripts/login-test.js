const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const base = process.env.BASE_URL || 'https://electroductsint.github.io/ElectroWallet/';

  console.log('Opening', base);
  await page.goto(base, { waitUntil: 'networkidle2' });

  // Wait for auth inputs
  await page.waitForSelector('input[placeholder="Enter alias..."]', { timeout: 10000 });
  await page.type('input[placeholder="Enter alias..."]', 'testuser');
  await page.type('input[placeholder="********"]', 'test123');

  // Submit form
  await page.click('form button[type="submit"]');

  // Wait for navbar username to appear
  await page.waitForSelector('p.text-sm.font-bold.text-electro-secondary', { timeout: 10000 });
  const usernameText = await page.$eval('p.text-sm.font-bold.text-electro-secondary', el => el.textContent.trim());
  console.log('Username shown:', usernameText);

  // Reload to assert session persistence
  await page.reload({ waitUntil: 'networkidle2' });
  const usernameText2 = await page.$eval('p.text-sm.font-bold.text-electro-secondary', el => el.textContent.trim());
  console.log('After reload:', usernameText2);

  await browser.close();

  if (usernameText.includes('@testuser') && usernameText2.includes('@testuser')) {
    console.log('Login smoke test passed');
    process.exit(0);
  } else {
    console.error('Login smoke test failed');
    process.exit(2);
  }
})().catch(err => { console.error(err); process.exit(1); });
