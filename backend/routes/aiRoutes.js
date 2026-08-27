const express = require("express");
const multer = require("multer");

const {
  classifyWaste,
} = require("../controllers/aiController");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024,
  },

  fileFilter: (req, file, callback) => {
    if (file.mimetype.startsWith("image/")) {
      callback(null, true);
    } else {
      callback(new Error("Only image files are allowed."));
    }
  },
});

router.post(
  "/classify",
  upload.single("image"),
  classifyWaste
);

module.exports = router;