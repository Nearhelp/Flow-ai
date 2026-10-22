const fs = require('fs');
const path = require('path');

const FB_PAGE_ID = process.env.FB_PAGE_ID;
const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;

async function runStep3() {
  try {
    if (!FB_ACCESS_TOKEN) {
      console.log("FB_ACCESS_TOKEN abhi nahi dala gaya hai. Jaise hi aap GitHub Secrets mein token dalenge, Facebook upload apne aap chalu ho jayega.");
      return;
    }

    const downloadDir = path.resolve(__dirname, 'downloads');
    if (!fs.existsSync(downloadDir)) {
      console.log("Downloads folder abhi khali hai.");
      return;
    }

    const files = fs.readdirSync(downloadDir).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
    if (files.length === 0) {
      console.log("Upload karne ke liye abhi koi photo download nahi hui hai.");
      return;
    }

    const job = JSON.parse(fs.readFileSync('job.json', 'utf8'));
    const filePath = path.join(downloadDir, files[0]);
    const fileBuffer = fs.readFileSync(filePath);
    const blob = new Blob([fileBuffer], { type: 'image/jpeg' });

    const formData = new FormData();
    formData.append('source', blob, files[0]);
    formData.append('caption', job.hashtags);
    formData.append('access_token', FB_ACCESS_TOKEN);

    console.log("Satik Soch Facebook Page par photo upload ho rahi hai...");
    const fbUrl = `https://graph.facebook.com/v21.0/${FB_PAGE_ID}/photos`;

    const res = await fetch(fbUrl, {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));

    console.log("File 3 Done: Facebook par photo post ho gayi! Post ID:", data.id);
    fs.unlinkSync(filePath);
  } catch (err) {
    console.error("File 3 Error:", err.message);
    process.exit(1);
  }
}

runStep3();
