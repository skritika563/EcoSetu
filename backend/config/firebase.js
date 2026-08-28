const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

/**
 * Initialize Firebase Admin SDK using the service account credentials.
 *
 * Two ways to supply the credential, tried in this order:
 *   1. FIREBASE_SERVICE_ACCOUNT_BASE64 — the service account JSON file,
 *      base64-encoded into a single env var. Needed on hosts with no plain
 *      file upload for secrets (e.g. Fly.io) — `fly secrets set
 *      FIREBASE_SERVICE_ACCOUNT_BASE64="$(base64 -w0 service-account.json)"`.
 *   2. FIREBASE_SERVICE_ACCOUNT_PATH — a real file path, as before (local
 *      dev, or a host with a genuine secret-file mount like Render).
 */
const initializeFirebase = () => {
  // Prevent re-initialization if already initialized
  if (admin.apps.length > 0) {
    return admin;
  }

  let serviceAccount;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    try {
      const json = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf8");
      serviceAccount = JSON.parse(json);
    } catch {
      console.error("❌ FIREBASE_SERVICE_ACCOUNT_BASE64 is set but isn't valid base64-encoded JSON.");
      process.exit(1);
    }
  } else {
    const serviceAccountPath = path.resolve(
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
        "./config/firebase-service-account.json"
    );

    if (!fs.existsSync(serviceAccountPath)) {
      console.error(
        `❌ Firebase service account file not found at: ${serviceAccountPath}`
      );
      console.error(
        "   Set FIREBASE_SERVICE_ACCOUNT_PATH (file path) or FIREBASE_SERVICE_ACCOUNT_BASE64 (base64 JSON) in .env."
      );
      process.exit(1);
    }

    serviceAccount = require(serviceAccountPath);
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id,
  });

  console.log(
    `✅ Firebase Admin initialized (project: ${serviceAccount.project_id})`
  );

  return admin;
};

module.exports = { admin, initializeFirebase };
