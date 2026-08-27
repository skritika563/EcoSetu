const {
  classifyWasteImage,
} = require("../services/geminiService");

const classifyWaste = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "Please upload an image.",
      });
    }

    const result = await classifyWasteImage(
      req.file.buffer,
      req.file.mimetype
    );

    return res.status(200).json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("❌ Waste classification error:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "Failed to classify image.",
    });
  }
};

module.exports = {
  classifyWaste,
};