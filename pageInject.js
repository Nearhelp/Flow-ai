const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function runStep2() {
  const job = JSON.parse(fs.readFileSync('job.json', 'utf8'));
  const downloadDir = path.resolve(__dirname, 'downloads');
  if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1366,768']
  });

  try {
    const page = await browser.newPage();

    // Background mein seedha downloads folder mein save karne ki setting
    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: downloadDir
    });

    // Google Flow Login Cookies lagana
    if (process.env.FLOW_COOKIES) {
      const cookies = JSON.parse(process.env.FLOW_COOKIES);
      await page.setCookie(...cookies);
    }

    console.log("Google Flow open ho raha hai...");
    await page.goto('https://labs.google/fx/tools/flow', { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(5000);

    // 1. Image Mode aur Aspect Ratio (1:1) select karna
    await page.evaluate(async (ratioText) => {
      const wait = (ms) => new Promise(r => setTimeout(r, ms));
      const buttons = Array.from(document.querySelectorAll('button'));
      const configBtn = buttons.find(b => b.innerText.includes('tune') || b.innerText.includes('crop'));
      if (configBtn) {
        configBtn.click();
        await wait(1000);
      }

      const clickOption = async (txt) => {
        const els = Array.from(document.querySelectorAll('button, [role="tab"], [role="option"], [role="menuitem"]'));
        const target = els.find(el => (el.textContent || '').toLowerCase().includes(txt.toLowerCase()) && el.offsetParent !== null);
        if (target) { target.click(); await wait(500); }
      };

      await clickOption('image');
      const cleanRatio = ratioText.split(' (')[0].trim();
      await clickOption(cleanRatio);
      await clickOption('1x');
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
    }, job.aspect_ratio);

    await sleep(1500);

    // 2. Prompt Box mein Shayari Image Prompt insert karna aur Submit dabana
    const editorSelector = '[data-slate-editor="true"], [role="textbox"][contenteditable="true"], [role="textbox"]';
    await page.waitForSelector(editorSelector, { timeout: 15000 });
    await page.click(editorSelector);
    await sleep(500);

    await page.evaluate((text) => {
      const editor = document.querySelector('[data-slate-editor="true"]') || document.querySelector('[role="textbox"]');
      if (editor) {
        editor.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('delete', false, null);
        document.execCommand('insertText', false, text);
      }
    }, job.image_prompt);

    await sleep(1500);

    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => {
        const i = b.querySelector('i');
        return i && (i.textContent.trim() === 'arrow_forward' || i.textContent.trim() === 'send');
      });
      if (btn) btn.click();
    });

    console.log("Prompt submit ho gaya, photo banne ka wait kar rahe hain...");

    // 3. Photo banne ka wait aur Human-Like Right-Click se High Quality Download
    await page.evaluate(async () => {
      const wait = (ms) => new Promise(r => setTimeout(r, ms));
      for (let step = 0; step < 60; step++) {
        await wait(2000);
        const tile = document.querySelector('[data-tile-id]');
        if (!tile) continue;

        const icons = Array.from(tile.querySelectorAll('i')).map(i => (i.textContent || '').toLowerCase());
        const isGenerating = icons.some(t => t.includes('movie') || t.includes('hourglass') || t.includes('progress') || t.includes('stop'));

        if (!isGenerating) {
          const media = tile.querySelector('img, video');
          if (media) {
            const r = media.getBoundingClientRect();
            const x = r.left + r.width / 2;
            const y = r.top + r.height / 2;

            // Human-like Right Click
            media.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, clientX: x, clientY: y }));
            media.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 2 }));
            await wait(700);

            // Click Download Option
            const menuItems = Array.from(document.querySelectorAll('[role="menuitem"]'));
            const dlBtn = menuItems.find(el => el.textContent.toLowerCase().includes('download'));
            if (dlBtn) {
              dlBtn.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
              await wait(300);
              dlBtn.click();
              await wait(700);

              // Select Highest Quality (2k / 4k / 1k)
              const subItems = Array.from(document.querySelectorAll('[role="menuitem"], button'));
              const qBtn = subItems.find(el => el.textContent.toLowerCase().includes('2k')) || subItems[subItems.length - 1];
              if (qBtn) {
                qBtn.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
                await wait(400);
                qBtn.click();
              }
            }
            break;
          }
        }
      }
    });

    // 4. Folder mein file aane tak wait karna
    for (let i = 0; i < 30; i++) {
      await sleep(2000);
      const files = fs.readdirSync(downloadDir).filter(f => !f.endsWith('.crdownload') && !f.endsWith('.tmp'));
      if (files.length > 0) {
        console.log("File 2 Done: Photo bina watermark download ho gayi ->", files[0]);
        break;
      }
    }
  } finally {
    await browser.close();
  }
}

runStep2().catch(err => {
  console.error("File 2 Error:", err.message);
  process.exit(1);
});
