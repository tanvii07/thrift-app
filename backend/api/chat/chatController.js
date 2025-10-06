const Chat = require("../../models/Chat");
const Message = require("../../models/Message");
const Post = require("../../models/Post");
const User = require("../../models/User");

// Create a new chat when thrift request is accepted
exports.createChat = async (req, res) => {
  try {
    const { postId, requestId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Find the accepted thrift request
    const thriftRequest = post.thriftRequests.id(requestId);
    if (!thriftRequest || thriftRequest.status !== 'accepted') {
      return res.status(400).json({ error: "Thrift request not found or not accepted" });
    }

    // Check if chat already exists for this thrift request
    const existingChat = await Chat.findOne({ thriftRequestId: requestId });
    if (existingChat) {
      return res.json({ 
        message: "Chat already exists", 
        chat: existingChat 
      });
    }

    // Create new chat
    const chat = new Chat({
      participants: [post.author, thriftRequest.requester],
      post: postId,
      thriftRequestId: requestId,
      status: 'active'
    });

    await chat.save();

    // Populate the chat with participant details
    await chat.populate([
      { path: 'participants', select: 'username profilePic' },
      { path: 'post', select: 'caption image thriftPrice' }
    ]);

    res.status(201).json({
      message: "Chat created successfully",
      chat
    });

  } catch (error) {
    console.error("Create chat error:", error);
    res.status(500).json({ error: "Failed to create chat" });
  }
};

// Get all chats for a user
exports.getUserChats = async (req, res) => {
  try {
    const userId = req.user._id;

    const chats = await Chat.find({
      participants: userId,
      status: 'active'
    })
    .populate([
      { path: 'participants', select: 'username profilePic' },
      { path: 'post', select: 'caption image thriftPrice' },
      { path: 'lastMessage', select: 'content createdAt sender' }
    ])
    .sort({ lastMessageAt: -1 });

    res.json({ chats });

  } catch (error) {
    console.error("Get user chats error:", error);
    res.status(500).json({ error: "Failed to get chats" });
  }
};

// Get messages for a specific chat
exports.getChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    // Verify user is participant in this chat
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    if (!chat.participants.includes(userId)) {
      return res.status(403).json({ error: "Not authorized to view this chat" });
    }

    const messages = await Message.find({ chat: chatId })
      .populate('sender', 'username profilePic')
      .sort({ createdAt: 1 });

    // Mark messages as read
    await Message.updateMany(
      { chat: chatId, sender: { $ne: userId }, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({ messages });

  } catch (error) {
    console.error("Get chat messages error:", error);
    res.status(500).json({ error: "Failed to get messages" });
  }
};

// Send a message
exports.sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content, messageType = 'text' } = req.body;
    const userId = req.user._id;

    // Verify user is participant in this chat
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    if (!chat.participants.includes(userId)) {
      return res.status(403).json({ error: "Not authorized to send messages in this chat" });
    }

    if (chat.status === 'closed') {
      return res.status(400).json({ error: "Chat is closed" });
    }

    // Create new message
    const message = new Message({
      chat: chatId,
      sender: userId,
      content,
      messageType
    });

    await message.save();

    // Update chat's last message
    chat.lastMessage = message._id;
    chat.lastMessageAt = new Date();
    await chat.save();

    // Populate sender info
    await message.populate('sender', 'username profilePic');

    res.status(201).json({
      message: "Message sent successfully",
      newMessage: message
    });

  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
};

// Send decline reason message
exports.sendDeclineReason = async (req, res) => {
  try {
    const { postId, requestId } = req.params;
    const { reason } = req.body;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (post.author.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Find thrift request and ensure it's marked declined
    const thriftRequest = post.thriftRequests.id(requestId) || post.thriftRequests.id(String(requestId));
    if (!thriftRequest) {
      return res.status(404).json({ error: "Thrift request not found" });
    }
    if (thriftRequest.status === 'pending') {
      thriftRequest.status = 'declined';
      await post.save();
    }

    // Create a temporary chat for decline reason
    let chat = await Chat.findOne({ thriftRequestId: requestId });
    
    if (!chat) {
      chat = new Chat({
        participants: [post.author, thriftRequest.requester],
        post: postId,
        thriftRequestId: requestId,
        status: 'closed' // Chat is closed after decline reason
      });
      await chat.save();
    }

    // Send decline reason message
    const message = new Message({
      chat: chat._id,
      sender: userId,
      content: reason,
      messageType: 'decline_reason'
    });

    await message.save();

    // Update chat's last message
    chat.lastMessage = message._id;
    chat.lastMessageAt = new Date();
    await chat.save();

    // Populate sender info
    await message.populate('sender', 'username profilePic');

    res.status(201).json({
      message: "Decline reason sent successfully",
      newMessage: message
    });

  } catch (error) {
    console.error("Send decline reason error:", error);
    res.status(500).json({ error: "Failed to send decline reason" });
  }
};

// Close a chat
exports.closeChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    if (!chat.participants.includes(userId)) {
      return res.status(403).json({ error: "Not authorized to close this chat" });
    }

    chat.status = 'closed';
    await chat.save();

    res.json({ message: "Chat closed successfully" });

  } catch (error) {
    console.error("Close chat error:", error);
    res.status(500).json({ error: "Failed to close chat" });
  }
};
