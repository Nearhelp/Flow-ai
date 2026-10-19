const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function runFlowAutomation() {
  if (!fs.existsSync('job.json')) {
    console.error("job.json nahi mila! Pehle File 1 chalayein.");
    process.exit(1);
  }

  const job = JSON.parse(fs.readFileSync('job.json', 'utf8'));
  const downloadDir = path.resolve(__dirname, 'downloads');
  if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir, { recursive: true });

  const extensionPath = path.resolve(__dirname);

  console.log("Step 1: Chrome Browser aur Extension load ho raha hai...");
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--window-size=1366,768'
    ]
  });

  try {
    const page = await browser.newPage();

    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: downloadDir
    });

    if (process.env.FLOW_COOKIES) {
      console.log("Google Flow Login Cookies set kar rahe hain...");
      const cookies = JSON.parse(process.env.FLOW_COOKIES);
      await page.setCookie(...cookies);
    }

    console.log("Step 2: Google Flow (labs.google) open kar rahe hain...");
    await page.goto('https://labs.google/fx/tools/flow', { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(6000);

    console.log("Step 3: Prompt aur Ratio bhej kar generation start kar rahe hain...");
    await page.evaluate((jobData) => {
      window.postMessage({
        type: 'EXTERNAL_START_FLOW',
        payload: {
          prompt: jobData.image_prompt,
          mode: jobData.mode,
          index: 1,
          applySettings: true,
          settings: {
            'setting-aspect-ratio': jobData.aspect_ratio,
            'setting-outputs': '1',
            'setting-image-model': jobData.image_model,
            'setting-auto-download-image': jobData.quality
          }
        }
      }, '*');
    }, job);

    console.log("Step 4: Photo banne aur human-like download hone ka wait kar rahe hain...");
    let downloadedFile = null;
    for (let i = 0; i < 60; i++) {
      await sleep(3000);
      const files = fs.readdirSync(downloadDir).filter(f => !f.endsWith('.crdownload') && !f.endsWith('.tmp'));
      if (files.length > 0) {
        downloadedFile = path.join(downloadDir, files[0]);
        break;
      }
    }

    if (!downloadedFile) {
      throw new Error("Download folder mein photo nahi aayi (Timeout).");
    }

    console.log("Photo safalta se download ho gayi:", downloadedFile);
    await sleep(3000);
  } finally {
    await browser.close();
  }
}

runFlowAutomation().catch(err => {
  console.error("File 2 Error:", err.message);
  process.exit(1);
});
