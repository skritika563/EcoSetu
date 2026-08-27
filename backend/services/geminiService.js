// Load environment variables before accessing process.env
require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

// ─── Gemini Configuration ──────────────────────────────────────────────────

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error(
    "GEMINI_API_KEY is not configured. Please check backend/.env"
  );
}

const ai = new GoogleGenAI({
  apiKey: apiKey,
});

const MODEL_NAME =
  process.env.GEMINI_MODEL || "gemini-3.7-flash";

// ─── Waste Categories ───────────────────────────────────────────────────────

const WASTE_CATEGORIES = [
  "Plastic",
  "Paper",
  "Glass",
  "Metal",
  "Organic",
  "E-Waste",
  "Other",
];

// ─── Classify Waste Image ───────────────────────────────────────────────────

const classifyWasteImage = async (imageBuffer, mimeType) => {
  if (!imageBuffer) {
    throw new Error("Image is required.");
  }

  if (!mimeType) {
    throw new Error("Image MIME type is required.");
  }

  // Convert uploaded image to Base64
  const base64Image = imageBuffer.toString("base64");

  const prompt = `
You are EcoSetu's waste classification AI.

Analyze the uploaded image and identify the main waste item.

Classify the item into EXACTLY ONE of these categories:

${WASTE_CATEGORIES.join(", ")}

Return ONLY valid JSON using exactly this structure:

{
  "category": "Plastic",
  "item": "Plastic bottle",
  "confidence": 95,
  "recyclable": true,
  "disposal": "Place it in the appropriate recycling bin.",
  "explanation": "The object appears to be a plastic bottle."
}

Rules:

1. "category" MUST be one of:
   Plastic, Paper, Glass, Metal, Organic, E-Waste, Other

2. "item" should be a short description of the object.

3. "confidence" must be a number from 0 to 100.

4. "recyclable" must be either true or false.

5. "disposal" should give a short, practical disposal recommendation.

6. "explanation" should briefly explain why the item was classified this way.

7. If the image is unclear or cannot be identified, use "Other"
   and provide a lower confidence score.

8. Do not use Markdown.

9. Do not use code fences.

10. Return ONLY the JSON object.
`;

  // ─── Send Image + Prompt to Gemini ───────────────────────────────────────

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: [
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Image,
        },
      },
      {
        text: prompt,
      },
    ],
  });

  // ─── Process Gemini Response ─────────────────────────────────────────────

  const responseText = response.text?.trim();

  if (!responseText) {
    throw new Error("Gemini returned an empty response.");
  }

  let result;

  try {
    result = JSON.parse(responseText);
  } catch (error) {
    console.error("❌ Invalid Gemini response:");
    console.error(responseText);

    throw new Error(
      "Gemini returned an invalid classification response."
    );
  }

  return result;
};

// ─── Export ─────────────────────────────────────────────────────────────────

module.exports = {
  classifyWasteImage,
};