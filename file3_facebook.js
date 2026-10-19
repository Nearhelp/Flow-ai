const fs = require('fs');
const path = require('path');

const FB_PAGE_ID = process.env.FB_PAGE_ID;
const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;

async function runStep3() {
  try {
    const job = JSON.parse(fs.readFileSync('job.json', 'utf8'));
    const downloadDir = path.resolve(__dirname, 'downloads');
    const files = fs.readdirSync(downloadDir).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));

    if (files.length === 0) {
      throw new Error("Downloads folder mein photo nahi mili!");
    }

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

    // Upload ke baad photo delete karna taaki storage na bhare
    fs.unlinkSync(filePath);
  } catch (err) {
    console.error("File 3 Error:", err.message);
    process.exit(1);
  }
}

runStep3();
