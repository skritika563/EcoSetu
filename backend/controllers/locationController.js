const locationService = require("../services/locationService");

/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Location Controller
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * Thin authenticated proxy in front of locationService — every route here
 * requires a signed-in user (see locationRoutes.js), which is what keeps the
 * LocationIQ free-tier quota from being burned by anonymous callers.
 */

const handleServiceError = (res, error, fallbackMessage) => {
  console.error("Location service error:", error.message);
  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.statusCode ? error.message : fallbackMessage,
    error: { code: error.code || "INTERNAL_ERROR" },
  });
};

/** GET /api/location/geocode?q=<pincode or address text> */
const geocode = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) {
      return res.status(400).json({
        success: false,
        message: "A search query is required.",
        error: { code: "VALIDATION_ERROR" },
      });
    }
    const result = await locationService.geocode(q);
    return res.status(200).json({
      success: true,
      message: result ? "Location found" : "No matching location",
      data: result,
    });
  } catch (error) {
    return handleServiceError(res, error, "Internal server error while searching for that location.");
  }
};

/** GET /api/location/reverse-geocode?lat=<>&lng=<> */
const reverseGeocode = async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({
        success: false,
        message: "Valid lat and lng query params are required.",
        error: { code: "VALIDATION_ERROR" },
      });
    }
    const result = await locationService.reverseGeocode(lat, lng);
    return res.status(200).json({
      success: true,
      message: result ? "Address found" : "No address found at this point",
      data: result,
    });
  } catch (error) {
    return handleServiceError(res, error, "Internal server error while looking up that location.");
  }
};

/** GET /api/location/directions?fromLat=&fromLng=&toLat=&toLng= */
const directions = async (req, res) => {
  try {
    const fromLat = parseFloat(req.query.fromLat);
    const fromLng = parseFloat(req.query.fromLng);
    const toLat = parseFloat(req.query.toLat);
    const toLng = parseFloat(req.query.toLng);
    if ([fromLat, fromLng, toLat, toLng].some(Number.isNaN)) {
      return res.status(400).json({
        success: false,
        message: "Valid fromLat, fromLng, toLat and toLng query params are required.",
        error: { code: "VALIDATION_ERROR" },
      });
    }
    const result = await locationService.getDirections({
      from: { lat: fromLat, lng: fromLng },
      to: { lat: toLat, lng: toLng },
    });
    return res.status(200).json({
      success: true,
      message: result ? "Route found" : "No route found",
      data: result,
    });
  } catch (error) {
    return handleServiceError(res, error, "Internal server error while calculating this route.");
  }
};

module.exports = { geocode, reverseGeocode, directions };
