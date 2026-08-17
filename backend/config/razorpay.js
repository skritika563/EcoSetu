const Razorpay = require("razorpay");

/**
 * Initialize the Razorpay SDK client.
 * Uses RAZOR_API_KEY / RAZOR_API_SECRET from environment variables — never
 * hard-coded, never logged, never sent to the frontend. Only the public
 * key_id (not a secret — it's meant to be given to the browser to open
 * Razorpay Checkout) ever leaves the backend, via
 * paymentController.createInstantFeeOrder's response.
 */
let razorpayClient = null;

const initializeRazorpay = () => {
  const keyId = process.env.RAZOR_API_KEY;
  const keySecret = process.env.RAZOR_API_SECRET;

  if (!keyId || !keySecret) {
    console.warn("⚠️  RAZOR_API_KEY / RAZOR_API_SECRET not set. Instant-pickup fee payments will be unavailable.");
    return null;
  }

  razorpayClient = new Razorpay({ key_id: keyId, key_secret: keySecret });
  console.log(`✅ Razorpay configured (${keyId.startsWith("rzp_live") ? "LIVE" : "test"} mode)`);
  return razorpayClient;
};

const getRazorpay = () => razorpayClient;

module.exports = { initializeRazorpay, getRazorpay };
