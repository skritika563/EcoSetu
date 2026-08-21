const { GoogleGenerativeAI } = require("@google/generative-ai");
const Product = require("../models/Product");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Marketplace AI Service — Gemini-backed listing assist
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * REAL, not simulated: this calls Google Gemini through the already-configured
 * @google/generative-ai SDK and GEMINI_API_KEY. There is no Math.random()
 * anywhere in this module — if Gemini is unreachable or returns something
 * unusable, this throws and the caller surfaces a plain failure. It never
 * substitutes invented text and passes it off as a model result.
 *
 * MODEL CHOICE: `gemini-flash-latest` is an alias that tracks Google's current
 * flash model, so this doesn't break the way a pinned version does — several
 * previously-valid pinned ids (gemini-2.0-flash, gemini-1.5-flash,
 * gemini-2.5-flash) are already 404 for new keys. The fallback chain below
 * exists for the same reason: if the alias moves or is regionally
 * unavailable, the next candidate is tried before giving up.
 *
 * The model only ever SUGGESTS. Its output lands in an editable form field
 * for the seller to accept, rewrite or ignore — nothing here is auto-applied,
 * and a suggested category is validated against the real enum before it can
 * reach the database.
 */

const MODEL_CANDIDATES = ["gemini-flash-latest", "gemini-3-flash-preview", "gemini-flash-lite-latest"];

let client = null;
const getClient = () => {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!client) client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return client;
};

const aiUnavailable = () => {
  const error = new Error("AI assist is unavailable right now. Please write your listing manually.");
  error.statusCode = 503;
  error.code = "AI_UNAVAILABLE";
  return error;
};

/**
 * Run a prompt through the first model candidate that responds, asking for
 * JSON mode so the reply is parseable rather than prose wrapped in markdown.
 */
const generateJson = async (prompt) => {
  const genAI = getClient();
  if (!genAI) throw aiUnavailable();

  let lastError = null;
  for (const modelName of MODEL_CANDIDATES) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: "application/json", temperature: 0.7 },
      });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      return JSON.parse(text);
    } catch (error) {
      lastError = error;
      // Try the next candidate — a 404 here means this id isn't available to
      // this key, which the next one may well be.
    }
  }

  console.error("Gemini listing assist failed:", lastError?.message);
  throw aiUnavailable();
};

const CATEGORY_LIST = Product.CATEGORIES.join(", ");

const BASE_CONTEXT = `You write marketplace listings for EcoSetu, an Indian circular-economy platform where people sell reusable, recovered, recycled and upcycled goods.
Write in clear, honest, plain English. Never invent specifications, measurements, brand names or condition claims the seller did not provide.
Do not exaggerate. If the seller's notes are sparse, keep the output modest and factual rather than padding it.`;

/**
 * Generate title + description + suggested category from the seller's rough notes.
 * @param {{ notes: string, category?: string, condition?: string, material?: string, city?: string }} input
 */
const generateListingContent = async ({ notes, category, condition, material, city }) => {
  const hints = [
    category ? `Seller-selected category: ${category}` : null,
    condition ? `Condition: ${condition}` : null,
    material ? `Material: ${material}` : null,
    city ? `Location: ${city}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = `${BASE_CONTEXT}

Return ONLY a JSON object with exactly these keys:
- "title": string, 5-12 words, specific and searchable, no ALL CAPS, no emoji
- "description": string, 40-90 words, one or two short paragraphs, mentioning condition honestly
- "category": string, MUST be exactly one of: ${CATEGORY_LIST}

${hints}

Seller's notes about the item:
"""${notes}"""`;

  const parsed = await generateJson(prompt);

  // Validate before returning — a hallucinated category must never reach the
  // database. An unrecognised value is dropped rather than coerced into a
  // wrong-but-valid one.
  const suggestedCategory = Product.CATEGORIES.includes(parsed.category) ? parsed.category : null;

  if (!parsed.title?.trim() || !parsed.description?.trim()) throw aiUnavailable();

  return {
    title: String(parsed.title).trim().slice(0, 120),
    description: String(parsed.description).trim().slice(0, 2000),
    category: suggestedCategory,
  };
};

module.exports = { generateListingContent, MODEL_CANDIDATES };
