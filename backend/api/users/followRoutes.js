const express = require("express");
const router = express.Router();
const { followUser, unfollowUser } = require("./followController");
const auth = require("../../middleware/auth");

router.put("/follow/:targetUserId", auth, followUser);
router.put("/unfollow/:targetUserId", auth, unfollowUser);

module.exports = router;
