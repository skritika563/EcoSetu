const { GoogleGenerativeAI } = require("@google/generative-ai");
const { MODEL_CANDIDATES } = require("./marketplaceAiService");
const { SCRAP_CATEGORIES } = require("../constants/categories");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Gemini Service — waste image classification
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * ONE Gemini client pattern for the whole backend — this mirrors
 * marketplaceAiService.js exactly on purpose (same @google/generative-ai SDK,
 * same lazy getClient(), same graceful AI_UNAVAILABLE degradation, same
 * MODEL_CANDIDATES fallback chain, imported straight from there rather than
 * re-declared). A previous version of this file used a different package
 * (@google/genai) that (a) wasn't even installed, crashing the whole server
 * at require-time regardless of whether AI was actually being used, and
 * (b) threw synchronously if GEMINI_API_KEY was missing — taking down every
 * unrelated endpoint over one optional feature's misconfiguration. Neither
 * mistake is repeated here: getClient() returns null when unconfigured, and
 * every caller path degrades to a controlled "unavailable" response instead.
 *
 * The AI is ONLY an assistant. It suggests categories; it never decides a
 * final price or a collector-verified category on its own (see
 * pickupController for where those are actually computed/confirmed).
 */

let client = null;
const getClient = () => {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!client) client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return client;
};

/**
 * The exact, only vocabulary the classification contract may return —
 * imported from constants/categories.js (the SAME list ScrapRate and Pickup
 * validate against), not declared here. `WASTE_CATEGORIES` is kept as this
 * file's own export name since "waste categories" reads naturally in an AI
 * classification context, but it's the identical array, not a fork of it.
 */
const WASTE_CATEGORIES = SCRAP_CATEGORIES;

/** The one honest "couldn't classify" shape — returned whenever Gemini is unreachable, unconfigured, or gives nothing usable. */
const unavailableResult = () => ({
  classification_possible: false,
  categories: [],
  estimated_visible_item_count: 0,
  uncertainties: ["Unable to confidently identify the material."],
  summary: "Classification unavailable.",
});

/**
 * Written to work identically for one image or several — `imageCount` is
 * interpolated so the instruction is accurate either way (photo → photos,
 * "the image" → "all N images together") without needing two prompt
 * templates. Multiple photos are the SAME batch of items from different
 * angles/piles, not unrelated pictures — Gemini is told to treat them as
 * one combined scene and de-duplicate categories it sees repeated across
 * shots rather than double-counting them.
 */
const buildPrompt = (imageCount) => `You are EcoSetu's waste/item classification assistant. EcoSetu is an Indian circular-economy platform for scrap collection and reusable-goods resale.

${imageCount > 1
  ? `You are given ${imageCount} photos of the SAME batch of items (different angles or piles from one pickup, not separate unrelated scenes). Look across all ${imageCount} photos together and identify every distinct waste/reusable item category visible overall — do not report the same real-world category twice just because it appears in more than one photo.`
  : `Look at the image and identify every distinct waste/reusable item category visible.`}

Return ONLY a JSON object with exactly this structure (no markdown, no code fences, no extra text):

{
  "classification_possible": true,
  "categories": [
    { "category": "plastic", "confidence": 0.95, "evidence": "Several plastic bottles are clearly visible." }
  ],
  "estimated_visible_item_count": 3,
  "uncertainties": [],
  "summary": "Plastic scrap detected."
}

Rules:
1. "category" MUST be exactly one of: ${WASTE_CATEGORIES.join(", ")}. Never invent a category outside this list.
2. "confidence" is a number between 0 and 1 (not a percentage).
3. "evidence" is a short phrase naming what you actually see${imageCount > 1 ? " (say which photo(s) if it helps)" : ""}.
4. "estimated_visible_item_count" is your best-effort count of distinct items visible ${imageCount > 1 ? "across all photos combined" : ""}, as a number.
5. "uncertainties" is always an array of strings (empty array if none) — note anything ambiguous, occluded, or hard to tell apart.
6. "summary" is one short sentence.
7. If ${imageCount > 1 ? "the images are" : "the image is"} too unclear, empty, or unrelated to identify anything reliably, set "classification_possible" to false, "categories" to an empty array, and explain why in "summary" and "uncertainties" — do not guess.
8. This is a SUGGESTION for a human to review, never a final decision — a low-confidence guess is more useful than a forced high-confidence one.`;

const aiUnavailable = () => {
  const error = new Error("AI classification is unavailable right now.");
  error.statusCode = 503;
  error.code = "AI_UNAVAILABLE";
  return error;
};

/** Clamp to [0, 1]; non-numeric input becomes 0 rather than throwing. */
const toConfidence = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.min(1, Math.max(0, num));
};

/**
 * Never trust the raw model output as-is — same principle as
 * marketplaceAiService's category validation: a hallucinated category or a
 * malformed field must never reach the caller. Anything that doesn't fit the
 * contract is dropped or coerced, not passed through.
 */
const sanitizeResult = (parsed) => {
  const rawCategories = Array.isArray(parsed?.categories) ? parsed.categories : [];
  const categories = rawCategories
    .filter((c) => c && WASTE_CATEGORIES.includes(c.category))
    .map((c) => ({
      category: c.category,
      confidence: toConfidence(c.confidence),
      evidence: typeof c.evidence === "string" ? c.evidence.slice(0, 300) : "",
    }));

  if (categories.length === 0) {
    return unavailableResult();
  }

  return {
    classification_possible: true,
    categories,
    estimated_visible_item_count: Number.isFinite(Number(parsed?.estimated_visible_item_count))
      ? Math.max(0, Math.round(Number(parsed.estimated_visible_item_count)))
      : categories.length,
    uncertainties: Array.isArray(parsed?.uncertainties) ? parsed.uncertainties.map((u) => String(u)).slice(0, 10) : [],
    summary: typeof parsed?.summary === "string" && parsed.summary.trim() ? parsed.summary.trim().slice(0, 300) : "Classification complete.",
  };
};

/**
 * How long a single model candidate gets before it's abandoned in favour of
 * the next one. A working call normally finishes in a few seconds; this is
 * a safety net for a hung/dead candidate, not the expected duration — kept
 * short enough that even a worst case of every candidate timing out
 * (3 × 12s = 36s) stays under the frontend's 45s request timeout for this
 * endpoint (see services/aiService.js).
 */
const PER_ATTEMPT_TIMEOUT_MS = 12000;

/**
 * The @google/generative-ai SDK's generateContent() has no built-in timeout
 * — if one candidate model just hangs (no response, no rejection: seen for
 * real in testing, took well over 2 minutes with nothing back), the
 * for-loop below never moves on, because it only advances on a REJECTED
 * promise. Racing every attempt against a timer that DOES reject turns a
 * silent, unbounded hang into a normal "try the next candidate" failure.
 */
const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Gemini request timed out after ${ms}ms`)), ms)),
  ]);

/**
 * Classify one or more waste/item images — TOGETHER, as one Gemini call, not
 * one call per image. Previously only a single image was ever accepted
 * (both here and in the multer/route layer above it), so uploading a second
 * photo silently had no effect; a household photographing scrap from two
 * angles, or two different piles, would only ever get the first photo's
 * classification back. Sending every image as its own part in the SAME
 * request lets Gemini reason across all of them at once (and de-duplicate
 * a category it sees in more than one photo — see buildPrompt) rather than
 * requiring N separate round trips that the caller would then have to merge
 * itself.
 *
 * Never throws for "AI just isn't available" — callers get the controlled
 * unavailableResult() shape for that. Only throws (aiUnavailable(), caught
 * by aiController as a 503) when every candidate has failed or timed out.
 *
 * @param {{buffer: Buffer, mimeType: string}[]} images - 1 to MAX_IMAGES_PER_REQUEST images
 * @returns {Promise<{classification_possible: boolean, categories: object[], estimated_visible_item_count: number, uncertainties: string[], summary: string}>}
 */
const classifyWasteImage = async (images) => {
  const valid = (images ?? []).filter((img) => img?.buffer && img?.mimeType);
  if (valid.length === 0) throw aiUnavailable();

  const genAI = getClient();
  if (!genAI) throw aiUnavailable();

  const imageParts = valid.map((img) => ({
    inlineData: { mimeType: img.mimeType, data: img.buffer.toString("base64") },
  }));
  const prompt = buildPrompt(valid.length);
  const candidates = process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL, ...MODEL_CANDIDATES] : MODEL_CANDIDATES;

  let lastError = null;
  for (const modelName of candidates) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
      });
      const result = await withTimeout(
        model.generateContent([prompt, ...imageParts]),
        PER_ATTEMPT_TIMEOUT_MS
      );
      const text = result.response.text();
      const parsed = JSON.parse(text);
      return sanitizeResult(parsed);
    } catch (error) {
      lastError = error;
      // A 404/unsupported-model, or now a timeout, on this candidate
      // doesn't mean AI is down — try the next one before giving up (same
      // reasoning as marketplaceAiService.js's fallback chain).
    }
  }

  console.error("Gemini waste classification failed:", lastError?.message);
  throw aiUnavailable();
};

module.exports = { classifyWasteImage, WASTE_CATEGORIES };
