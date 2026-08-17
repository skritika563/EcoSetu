/**
 * Mock AI scrap classification.
 *
 * Stands in for the Gemini Vision classification described in PROJECT_SPEC.md
 * ("Estimated Material Type, Recyclability, Confidence Score"). Picks from a
 * small set of realistic mixes rather than fully random output, so results
 * look like plausible AI predictions instead of noise.
 *
 * STATUS as of the full-stack integration pass: the backend has a Gemini
 * client configured (backend/config/gemini.js) but no classification
 * endpoint wired to it yet (aiRoutes is still commented out in
 * backend/app.js) — there is no real AI to call, so this stays a clearly
 * mocked local function rather than a half-built API that only pretends to
 * classify. When a real POST /api/ai/classify exists, this file's exported
 * shape ({category, confidence}[]) should stay the seam callers already code
 * against, so swapping the implementation needs no caller changes.
 *
 * IMPORTANT: this is a suggestion, never a final answer.
 *   - The household/organization may accept it, edit it, or skip it entirely
 *     when booking (category is optional at booking time).
 *   - The collector may use it as a starting point during verification, but
 *     must still confirm the ACTUAL categories and weights present — the
 *     collector's classification is the one that gets paid.
 */

/** Deterministic realistic mixes — always sums to 100. */
const MOCK_RESULTS = [
  [
    { category: "plastic", confidence: 70 },
    { category: "metal", confidence: 20 },
    { category: "paper", confidence: 10 },
  ],
  [
    { category: "cardboard", confidence: 55 },
    { category: "paper", confidence: 35 },
    { category: "plastic", confidence: 10 },
  ],
  [
    { category: "e-waste", confidence: 62 },
    { category: "metal", confidence: 28 },
    { category: "plastic", confidence: 10 },
  ],
  [
    { category: "glass", confidence: 48 },
    { category: "plastic", confidence: 32 },
    { category: "metal", confidence: 20 },
  ],
  [{ category: "mixed", confidence: 100 }],
];

/**
 * Run mock classification on whatever was uploaded.
 * @param {{ imageCount?: number }} [context]
 * @returns {Promise<{ category: string, confidence: number }[]>}
 */
export const classifyScrapImages = async ({ imageCount = 1 } = {}) => {
  // Simulated inference latency — long enough to justify a loading state,
  // short enough not to feel broken.
  await new Promise((resolve) => setTimeout(resolve, 900));

  const index = imageCount > 0 ? (imageCount * 7) % MOCK_RESULTS.length : Math.floor(Math.random() * MOCK_RESULTS.length);
  // Clone so callers can freely edit their copy of the suggestion.
  return MOCK_RESULTS[index].map((entry) => ({ ...entry }));
};

export default classifyScrapImages;
