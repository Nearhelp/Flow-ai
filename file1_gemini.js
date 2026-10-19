const fs = require('fs');

// Aapka Firebase URL aur Gemini API Key
const FIREBASE_URL = "https://nearhelp-bef33-default-rtdb.firebaseio.com/config.json";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function runStep1() {
  try {
    // 1. Firebase se command lena
    const fbRes = await fetch(FIREBASE_URL);
    const config = await fbRes.json() || {};

    const topic = config.topic || "Motivational Shayari in Hindi";
    const ratio = config.aspect_ratio || "1:1 (Square)";
    const hashtags = config.hashtags || "#SatikSoch #MotivationalShayari #HindiShayari";

    // 2. Gemini API ko 1 single request bhejna (No blocking)
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

    // 3. Agli file (Google Flow) ke liye data save karna
    fs.writeFileSync('job.json', JSON.stringify({
      image_prompt: result.image_prompt,
      aspect_ratio: ratio,
      hashtags: result.hashtags || hashtags
    }, null, 2));

    console.log("File 1 Done: Prompt ready for Google Flow!");
  } catch (err) {
    console.error("File 1 Error:", err.message);
    process.exit(1);
  }
}

runStep1();
