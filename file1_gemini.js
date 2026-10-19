const fs = require('fs');

// Safe URL: Yeh sirf satik_soch_config ko padhega/banayega, 'users' data ko nahi chhuega
const FIREBASE_CONFIG_URL = "https://nearhelp-bef33-default-rtdb.firebaseio.com/satik_soch_config.json";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function runStep1() {
  try {
    let config = null;
    const fbRes = await fetch(FIREBASE_CONFIG_URL);
    config = await fbRes.json();

    // Agar Firebase mein satik_soch_config nahi hai, toh bina purana data delete kiye naya bana dega
    if (!config) {
      const localFile = JSON.parse(fs.readFileSync('firebase_data.json', 'utf8'));
      config = localFile.satik_soch_config;
      await fetch(FIREBASE_CONFIG_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      });
      console.log("Firebase mein bina purana data chhue satik_soch_config ban gaya!");
    }

    if (config.status && config.status !== "ON") {
      console.log("Status OFF hai.");
      process.exit(0);
    }

    const topic = config.topic || "Motivational Shayari in Hindi";
    const ratio = config.aspect_ratio || "1:1 (Square)";
    const hashtags = config.hashtags || "#SatikSoch #MotivationalShayari #HindiShayari";

    const promptText = `Create a powerful 2-line Hindi Shayari on "${topic}". Then write an English image generation prompt for Google Flow where this exact Hindi Shayari is clearly written in the center of the image on an aesthetic background, ${ratio} ratio, no watermark. Return ONLY valid JSON: {"image_prompt": "...", "hashtags": "${hashtags}"}`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const res = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    const data = await res.json();
    const result = JSON.parse(data.candidates[0].content.parts[0].text);

    fs.writeFileSync('job.json', JSON.stringify({
      image_prompt: result.image_prompt,
      aspect_ratio: ratio,
      hashtags: result.hashtags || hashtags
    }, null, 2));

    console.log("File 1 Done: Prompt ready!");
  } catch (err) {
    console.error("File 1 Error:", err.message);
    process.exit(1);
  }
}

runStep1();
