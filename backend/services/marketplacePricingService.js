/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Marketplace Pricing Service
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * The ONLY place a marketplace order total is computed. Mirrors the rule
 * services/pricingService.js enforces for scrap payouts: the client sends
 * what it wants to buy and how many, never what it costs.
 *
 * The unit price always comes from the live Product document, so a buyer
 * editing a price in devtools changes nothing — and a seller who raises
 * their price mid-checkout is honoured at the price the server reads at
 * order time, which is then snapshotted onto the order.
 */

/**
 * @param {object} product - the live Product document
 * @param {number} quantity
 * @returns {{ unitPrice: number, quantity: number, totalAmount: number }}
 * @throws when quantity is invalid or exceeds available stock
 */
const calculateOrderTotal = (product, quantity) => {
  const qty = Number(quantity);

  if (!Number.isInteger(qty) || qty < 1) {
    const error = new Error("Quantity must be a whole number of at least 1.");
    error.statusCode = 400;
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  if (qty > product.quantity) {
    const error = new Error(
      product.quantity === 0
        ? "This listing is out of stock."
        : `Only ${product.quantity} available.`
    );
    error.statusCode = 400;
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  const unitPrice = product.price;
  // Rounded to paise so floating-point drift can never produce a total like
  // 149.99999999 on the order record.
  const totalAmount = Math.round(unitPrice * qty * 100) / 100;

  return { unitPrice, quantity: qty, totalAmount };
};

module.exports = { calculateOrderTotal };
