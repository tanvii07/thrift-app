// backend/api/ai/aiRoutes.js
const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const { getSuggestedOutfits, buildOutfit } = require("./aiController");

router.get("/suggestions", auth, getSuggestedOutfits);
router.post("/outfit", auth, buildOutfit);

module.exports = router;
