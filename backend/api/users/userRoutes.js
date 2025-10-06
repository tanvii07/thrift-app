const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const { toggleFollow, getUserById, getNotifications } = require("./userController");

// GET /api/users/notifications
router.get("/notifications/me", auth, getNotifications);
// GET /api/users/:userId
router.get("/:userId", getUserById);

// POST /api/users/:userId/follow
router.post("/:userId/follow", auth, toggleFollow);

module.exports = router;
