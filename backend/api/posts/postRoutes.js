const express = require("express");
const router = express.Router();
const {
  createPost,
  getPublicFeed,
  getPostsByUser,
  getUserStats,
  getUserStatsById,
  getFeedWithAISuggestions,
  likePost,
  purchaseThrift,
  requestThrift,
  fixThriftStatus,
  acceptThriftRequest,
  declineThriftRequest,
  getPostById,
  deletePost,
} = require("./postController");
const auth = require("../../middleware/auth");
const { upload } = require("../../config/cloudinary");

// ✅ POST /api/posts/create
router.post("/create", auth, upload.single("image"), createPost);

// ✅ GET /api/posts/feed
router.get("/feed", getPublicFeed);

// ✅ GET /api/posts/feed-ai
router.get("/feed-ai", auth, getFeedWithAISuggestions);

// ✅ GET /api/posts/profile/stats
router.get("/profile/stats", auth, getUserStats);

// ✅ GET /api/posts/user/:userId
router.get("/user/:userId", getPostsByUser);

// ✅ GET /api/posts/user/:userId/stats
router.get("/user/:userId/stats", getUserStatsById);

// ✅ GET /api/posts/:postId
router.get("/:postId", getPostById);

// ✅ DELETE /api/posts/:postId
router.delete("/:postId", auth, deletePost);

// ✅ POST /api/posts/:postId/like
router.post("/:postId/like", auth, likePost);

// ✅ POST /api/posts/:postId/thrift-request
router.post("/:postId/thrift-request", auth, requestThrift);

// ✅ POST /api/posts/:postId/thrift-purchase
router.post("/:postId/thrift-purchase", auth, purchaseThrift);

// Accept thrift request
router.post("/:postId/thrift-request/:requestId/accept", auth, acceptThriftRequest);
// Decline thrift request
router.post("/:postId/thrift-request/:requestId/decline", auth, declineThriftRequest);

// ✅ POST /api/posts/fix-thrift-status (Temporary route to fix existing posts)
router.post("/fix-thrift-status", auth, fixThriftStatus);

module.exports = router;
