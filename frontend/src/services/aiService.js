/**
 * AI service — real Gemini-backed image classification, backed by
 * POST /api/ai/classify (backend/routes/aiRoutes.js).
 *
 * Used by both sides of the Pickup module's "AI assist" — the household's
 * booking-time suggestion (ScrapInfoStep.jsx) and the collector's on-site
 * verification assist (ScrapVerificationForm.jsx) — so there is exactly one
 * place that knows how to call this endpoint.
 */

import api from "@/services/api";

/**
 * @param {File[]} files - one or more image files (from a <input
 *   type="file"> pick, or Blobs converted to Files for already-uploaded
 *   photos) — all classified TOGETHER in one Gemini call, not one call per
 *   file (see backend/services/geminiService.js's classifyWasteImage).
 * @returns {Promise<{classification_possible: boolean, categories: {category: string, confidence: number, evidence: string}[], estimated_visible_item_count: number, uncertainties: string[], summary: string}>}
 */
export const classifyImage = async (files) => {
  const formData = new FormData();
  for (const file of files) formData.append("images", file);
  const response = await api.post("/ai/classify", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    // A real Gemini vision call — plus its model-fallback chain if the
    // first candidate is unavailable (see geminiService.js) — routinely
    // takes longer than the api instance's normal 15s default, which is
    // sized for ordinary CRUD calls, not an AI inference request. Overridden
    // here only, not globally, so every other endpoint still fails fast.
    timeout: 45000,
  });
  return response.data.data;
};
