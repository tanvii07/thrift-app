const express = require("express");
const router = express.Router();
const chatController = require("./chatController");
const auth = require("../../middleware/auth");

// Create chat when thrift request is accepted
router.post("/create/:postId/:requestId", auth, chatController.createChat);

// Get all chats for a user
router.get("/user", auth, chatController.getUserChats);

// Get messages for a specific chat
router.get("/:chatId/messages", auth, chatController.getChatMessages);

// Send a message
router.post("/:chatId/message", auth, chatController.sendMessage);

// Send decline reason message
router.post("/decline-reason/:postId/:requestId", auth, chatController.sendDeclineReason);

// Close a chat
router.put("/:chatId/close", auth, chatController.closeChat);

module.exports = router;
