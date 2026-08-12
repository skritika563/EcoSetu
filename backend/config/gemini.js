const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * Initialize Google Gemini (Generative AI) client.
 * Uses GEMINI_API_KEY from environment variables.
 */
const initializeGemini = () => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn(
      "⚠️  GEMINI_API_KEY not set. AI classification will be unavailable."
    );
    return null;
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  console.log("✅ Google Gemini AI initialized");

  return genAI;
};

module.exports = { initializeGemini };
