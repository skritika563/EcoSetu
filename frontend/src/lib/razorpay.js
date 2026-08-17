/**
 * Razorpay Checkout script loader.
 *
 * Loaded lazily (not in index.html) — most bookings are scheduled, not
 * instant, so most users never need this script at all; no reason to make
 * every page load fetch it upfront.
 */

let loadPromise = null;

export const loadRazorpayCheckout = () => {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(window.Razorpay);
    script.onerror = () => {
      loadPromise = null; // allow a retry on the next call
      reject(new Error("Couldn't load the payment provider. Check your connection and try again."));
    };
    document.body.appendChild(script);
  });

  return loadPromise;
};

export default loadRazorpayCheckout;
