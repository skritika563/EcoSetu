const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

/**
 * Initialize Firebase Admin SDK using the service account JSON file.
 * Path is read from FIREBASE_SERVICE_ACCOUNT_PATH env var.
 */
const initializeFirebase = () => {
  // Prevent re-initialization if already initialized
  if (admin.apps.length > 0) {
    return admin;
  }

  const serviceAccountPath = path.resolve(
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
      "./config/firebase-service-account.json"
  );

  if (!fs.existsSync(serviceAccountPath)) {
    console.error(
      `❌ Firebase service account file not found at: ${serviceAccountPath}`
    );
    console.error(
      "   Set FIREBASE_SERVICE_ACCOUNT_PATH in .env to the correct path."
    );
    process.exit(1);
  }

  const serviceAccount = require(serviceAccountPath);

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
