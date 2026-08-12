const cloudinary = require("cloudinary").v2;

/**
 * Configure Cloudinary SDK with credentials from environment variables.
 * Must be called once during app startup.
 */
const initializeCloudinary = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  console.log(
    `✅ Cloudinary configured (cloud: ${process.env.CLOUDINARY_CLOUD_NAME})`
  );

  return cloudinary;
};

module.exports = { cloudinary, initializeCloudinary };
