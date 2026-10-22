const fs = require('fs');

// Safe Path: Yeh sirf satik_soch_config box ko dekhega, Firebase ka purana data kabhi delete nahi hoga
const FIREBASE_CONFIG_URL = "https://nearhelp-bef33-default-rtdb.firebaseio.com/satik_soch_config.json";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function runStep1() {
  try {
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY GitHub Secrets mein nahi mila!");
    }

    // 1. Firebase se sirf satik_soch_config padhna
    const fbRes = await fetch(FIREBASE_CONFIG_URL);
    let config = await fbRes.json();

    // Agar satik_soch_config abhi tak nahi bana hai, toh bina purana data chhue naya bana do
    if (!config) {
      console.log("Firebase mein naya satik_soch_config box bana rahe hain (Purana data 100% safe hai)...");
      const localData = JSON.parse(fs.readFileSync('firebase_data.json', 'utf8'));
      config = localData.satik_soch_config;

      await fetch(FIREBASE_CONFIG_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      });
    }

    if (config.status && config.status !== "ON") {
      console.log("Automation status OFF hai.");
      process.exit(0);
    }

    const topic = config.topic || "Motivational Shayari in Hindi";
    const ratio = config.aspect_ratio || "1:1 (Square)";
    const hashtags = config.hashtags || "#SatikSoch #MotivationalShayari #HindiShayari";

    // 2. Gemini API ko 1 single request bhejna
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
    if (!res.ok) throw new Error(JSON.stringify(data));

    const result = JSON.parse(data.candidates[0].content.parts[0].text);

    // 3. File 2 ke liye job.json save karna
    fs.writeFileSync('job.json', JSON.stringify({
      image_prompt: result.image_prompt,
      aspect_ratio: ratio,
      quality: config.quality || "2k",
      hashtags: result.hashtags || hashtags
    }, null, 2));

    console.log("File 1 Done: Prompt safalta se ban gaya!");
  } catch (err) {
    console.error("File 1 Error:", err.message);
    process.exit(1);
  }
}

runStep1();
