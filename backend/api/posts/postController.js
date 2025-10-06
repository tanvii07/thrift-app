const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../../models/User");
const Post = require("../../models/Post");
const Notification = require("../../models/Notification");
const WardrobeItem = require("../../models/WardrobeItem");

exports.getPostById = async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId).populate("author", "username");
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    res.json(post);
  } catch (error) {
    console.error("Get post by id error:", error);
    res.status(500).json({ error: "Failed to fetch post" });
  }
};

// DELETE /api/posts/:postId
exports.deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: "Post not found" });
    if (post.author.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Remove references and related data
    await Promise.all([
      // Remove likes references from users
      User.updateMany({ likedPosts: postId }, { $pull: { likedPosts: postId } }),
      // Delete notifications linked to this post
      Notification.deleteMany({ post: postId }),
      // Delete wardrobe items that were added from this post
      WardrobeItem.deleteMany({ postId }),
    ]);

    await post.deleteOne();

    res.json({ message: "Post deleted" });
  } catch (error) {
    console.error("Delete post error:", error);
    res.status(500).json({ error: "Failed to delete post" });
  }
};

exports.likePost = async (req, res) => {
  try {
    const userId = req.user._id;
    const { postId } = req.params;

    const post = await Post.findById(postId);
    const user = await User.findById(userId);

    if (!post || !user) {
      return res.status(404).json({ message: "Post or user not found" });
    }

    const alreadyLiked = user.likedPosts.includes(postId);

    if (alreadyLiked) {
      user.likedPosts.pull(postId);
      post.likes.pull(userId);
    } else {
      user.likedPosts.push(postId);
      post.likes.push(userId);
    }

    await user.save();
    await post.save();

    res.status(200).json({
      liked: !alreadyLiked,
      likesCount: post.likes.length,
      postId: post._id,
    });
  } catch (err) {
    console.error("Like error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


exports.signup = async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({ username, email, password: hashedPassword });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.status(201).json({
      token,
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (error) {
    console.error("Signup error:", error);
    if (error.code === 11000) {
      return res.status(400).json({ error: "Username/email already exists" });
    }
    res.status(500).json({ error: "Signup failed. Please try again." });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.json({
      token,
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
};

exports.createPost = async (req, res) => {
  try {
    const { caption, isPublic = true, isThrift = false, tags = [], category = 'others' } = req.body;
    const imageUrl = req.file ? req.file.path : null;

    if (!imageUrl) {
      return res.status(400).json({ error: "Image upload failed" });
    }

    const post = await Post.create({
      image: imageUrl,
      caption,
      author: req.user._id,
      isPublic,
      category: ['tops','jeans_skirts','dresses','others'].includes(category) ? category : 'others',
      isThrift,
      thriftStatus: isThrift ? 'available' : undefined,
      tags: Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim()),
    });

    await post.populate("author", "username");
    res.status(201).json(post);
  } catch (error) {
    console.error("Create post error:", error);
    res.status(500).json({ error: "Failed to create post" });
  }
};

exports.getPublicFeed = async (req, res) => {
  try {
    console.log("Public Feed: Starting fetch");
    
    const posts = await Post.find({ isPublic: true })
      .populate("author", "username")
      .sort({ createdAt: -1 })
      .limit(50);

    console.log(`Public Feed: Found ${posts.length} posts`);

    // Group by category for convenience
    const grouped = posts.reduce((acc, p) => {
      const key = p.category || 'others';
      (acc[key] = acc[key] || []).push(p);
      return acc;
    }, {});

    res.json({ posts, grouped });
  } catch (error) {
    console.error("Get feed error:", error);
    console.error("Get feed error stack:", error.stack);
    res.status(500).json({ error: "Failed to fetch feed" });
  }
};

exports.getPostsByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const posts = await Post.find({
      author: userId,
      $or: [{ isPublic: true }, { author: req.user?._id }],
    })
      .populate("author", "username")
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (error) {
    console.error("Get user posts error:", error);
    res.status(500).json({ error: "Failed to fetch user posts" });
  }
};

exports.getUserStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const [totalPosts, totalThrifts] = await Promise.all([
      Post.countDocuments({ author: userId }),
      Post.countDocuments({ author: userId, isThrift: true }),
    ]);

    res.json({ totalPosts, totalThrifts });
  } catch (error) {
    console.error("Get user stats error:", error);
    res.status(500).json({ error: "Failed to fetch user stats" });
  }
};

exports.getUserStatsById = async (req, res) => {
  try {
    const { userId } = req.params;

    const [totalPosts, totalThrifts] = await Promise.all([
      Post.countDocuments({ author: userId }),
      Post.countDocuments({ author: userId, isThrift: true }),
    ]);

    res.json({ totalPosts, totalThrifts });
  } catch (error) {
    console.error("Get user stats error:", error);
    res.status(500).json({ error: "Failed to fetch user stats" });
  }
};

exports.getFeedWithAISuggestions = async (req, res) => {
  try {
    const user = req.user;
    console.log(`AI Feed: Starting for user ${user._id}`);

    // Get user's liked posts for recommendations
    const likedPosts = user.likedPosts || [];
    console.log(`AI Feed: User has ${likedPosts.length} liked posts`);

    if (likedPosts.length === 0) {
      // If user hasn't liked anything, return recent posts
      const recentPosts = await Post.find({
        isPublic: true,
        author: { $ne: user._id }
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('author', 'username');
      
      console.log(`AI Feed: No liked posts, returning ${recentPosts.length} recent posts`);
      return res.json({ suggestedPosts: recentPosts, topTags: [] });
    }

    // Get the actual liked posts data
    const likedPostsData = await Post.find({ _id: { $in: likedPosts } });
    console.log(`AI Feed: Retrieved ${likedPostsData.length} liked posts data`);

    // Analyze liked posts for patterns
    const tagFrequency = {};
    const categoryFrequency = {};
    const captionWords = {};

    likedPostsData.forEach(post => {
      // Count tags (weighted heavily since these are explicit preferences)
      (post.tags || []).forEach(tag => {
        const t = String(tag).replace(/^#/,'').toLowerCase();
        if (!t) return;
        tagFrequency[t] = (tagFrequency[t] || 0) + 3; // Higher weight for tags
      });

      // Count categories
      if (post.category) {
        categoryFrequency[post.category] = (categoryFrequency[post.category] || 0) + 2;
      }

      // Extract words from captions
      const words = (post.caption || '').toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 2) { // Only count words longer than 2 chars
          captionWords[word] = (captionWords[word] || 0) + 1;
        }
      });
    });

    // Get top preferences
    const topTags = Object.entries(tagFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag]) => tag);

    const topCategories = Object.entries(categoryFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category]) => category);

    const topCaptionWords = Object.entries(captionWords)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);

    console.log(`AI Feed: Top tags: ${topTags.join(', ')}`);
    console.log(`AI Feed: Top categories: ${topCategories.join(', ')}`);
    console.log(`AI Feed: Top caption words: ${topCaptionWords.join(', ')}`);

    // Build recommendation query
    const recommendationQueries = [];

    // First priority: exact tag matches
    if (topTags.length > 0) {
      recommendationQueries.push({
        tags: { $in: topTags },
        weight: 10
      });
    }

    // Second priority: category matches
    if (topCategories.length > 0) {
      recommendationQueries.push({
        category: { $in: topCategories },
        weight: 8
      });
    }

    // Third priority: caption word matches
    if (topCaptionWords.length > 0) {
      recommendationQueries.push({
        caption: { $regex: topCaptionWords.join('|'), $options: 'i' },
        weight: 5
      });
    }

    // Get recommendations using multiple strategies
    let suggestedPosts = [];
    const seenPostIds = new Set();

    for (const query of recommendationQueries) {
      const { weight, ...findQuery } = query;
      
      const posts = await Post.find({
        isPublic: true,
        author: { $ne: user._id },
        _id: { $nin: Array.from(seenPostIds) },
        ...findQuery
      })
        .sort({ createdAt: -1 })
        .limit(15)
        .populate('author', 'username');

      // Add weight to posts and add to suggestions
      posts.forEach(post => {
        if (!seenPostIds.has(post._id.toString())) {
          post.recommendationScore = weight;
          suggestedPosts.push(post);
          seenPostIds.add(post._id.toString());
        }
      });
    }

    // Sort by recommendation score and take top 10
    suggestedPosts.sort((a, b) => (b.recommendationScore || 0) - (a.recommendationScore || 0));
    suggestedPosts = suggestedPosts.slice(0, 10);

    // If we don't have enough recommendations, fill with recent posts
    if (suggestedPosts.length < 10) {
      const recentPosts = await Post.find({
        isPublic: true,
        author: { $ne: user._id },
        _id: { $nin: suggestedPosts.map(p => p._id) }
      })
        .sort({ createdAt: -1 })
        .limit(10 - suggestedPosts.length)
        .populate('author', 'username');
      
      suggestedPosts = [...suggestedPosts, ...recentPosts];
    }

    // Remove the recommendation score before sending to frontend
    suggestedPosts.forEach(post => {
      delete post.recommendationScore;
    });

    console.log(`AI Feed: Found ${suggestedPosts.length} suggested posts for user ${user._id}`);
    
    res.json({ suggestedPosts, topTags });
  } catch (error) {
    console.error("AI Feed error:", error);
    console.error("AI Feed error stack:", error.stack);
    // Fallback: return empty array
    res.json({ suggestedPosts: [], topTags: [] });
  }
};

exports.requestThrift = async (req, res) => {
  try {
    const { postId } = req.params;
    const requesterId = req.user._id;

    const post = await Post.findById(postId).populate("author", "username");
    
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (!post.isThrift) {
      return res.status(400).json({ error: "This item is not available for thrift" });
    }

    if (post.thriftStatus !== 'available') {
      return res.status(400).json({ 
        error: "This item is no longer available for thrift",
        status: post.thriftStatus 
      });
    }

    if (post.author._id.toString() === requesterId.toString()) {
      return res.status(400).json({ error: "You cannot request your own item" });
    }

    const existingRequest = post.thriftRequests.find(
      request => request.requester.toString() === requesterId.toString()
    );

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        // Idempotent behavior: ensure a corresponding notification exists
        const existingNotif = await Notification.findOne({
          user: post.author._id,
          type: 'thrift_request',
          post: post._id,
          fromUser: requesterId,
          $or: [
            { requestId: existingRequest._id },
            { requestId: { $exists: false } },
          ],
        });
        if (!existingNotif) {
          await Notification.create({
            user: post.author._id,
            type: 'thrift_request',
            message: `You have a new thrift request for your post: ${post.caption}`,
            post: post._id,
            fromUser: requesterId,
            requestId: existingRequest._id,
            requestStatus: 'pending',
          });
        }
        return res.json({
          message: 'Thrift request already pending',
          post: {
            _id: post._id,
            caption: post.caption,
            thriftRequests: post.thriftRequests,
          },
        });
      }
      return res.status(400).json({ 
        error: 'You have already requested this item',
        status: existingRequest.status 
      });
    }

    post.thriftRequests.push({
      requester: requesterId,
      requestDate: new Date(),
      status: 'pending'
    });
    // Get the ID of the newly pushed thrift request
    const newRequestId = post.thriftRequests[post.thriftRequests.length - 1]._id;
    
    await post.save();

    await Notification.create({
      user: post.author._id,
      type: "thrift_request",
      message: `You have a new thrift request for your post: ${post.caption}`,
      post: post._id,
      fromUser: requesterId,
      requestId: newRequestId,
      requestStatus: 'pending',
    });

    res.json({
      message: "Thrift request sent successfully!",
      post: {
        _id: post._id,
        caption: post.caption,
        thriftRequests: post.thriftRequests
      }
    });

  } catch (error) {
    console.error("Thrift request error:", error);
    res.status(500).json({ error: "Failed to send thrift request" });
  }
};

exports.purchaseThrift = async (req, res) => {
  try {
    const { postId } = req.params;
    const buyerId = req.user._id;

    const post = await Post.findById(postId).populate("author", "username");
    
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (!post.isThrift) {
      return res.status(400).json({ error: "This item is not available for thrift" });
    }

    if (post.thriftStatus !== 'available') {
      return res.status(400).json({ 
        error: "This item is no longer available for purchase",
        status: post.thriftStatus 
      });
    }

    if (post.author._id.toString() === buyerId.toString()) {
      return res.status(400).json({ error: "You cannot purchase your own item" });
    }

    post.thriftStatus = 'sold';
    post.thriftBuyer = buyerId;
    post.thriftPurchaseDate = new Date();
    
    await post.save();

    res.json({
      message: "Thrift item purchased successfully!",
      post: {
        _id: post._id,
        caption: post.caption,
        thriftStatus: post.thriftStatus,
        thriftBuyer: post.thriftBuyer,
        thriftPurchaseDate: post.thriftPurchaseDate
      }
    });

  } catch (error) {
    console.error("Thrift purchase error:", error);
    res.status(500).json({ error: "Failed to purchase thrift item" });
  }
};

exports.fixThriftStatus = async (req, res) => {
  try {
    const result = await Post.updateMany(
      { isThrift: true, thriftStatus: 'pending' },
      { thriftStatus: 'available' }
    );

    res.json({
      message: "Thrift status fixed successfully!",
      updatedCount: result.modifiedCount
    });

  } catch (error) {
    console.error("Fix thrift status error:", error);
    res.status(500).json({ error: "Failed to fix thrift status" });
  }
};

exports.acceptThriftRequest = async (req, res) => {
  try {
    const { postId, requestId } = req.params;
    const userId = req.user._id;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: "Post not found" });
    if (post.author.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Resolve the effective thrift request ID. Older clients may send a Notification ID here.
    let effectiveRequestId = requestId;
    let request = post.thriftRequests.id(effectiveRequestId) || post.thriftRequests.id(String(effectiveRequestId));

    if (!request) {
      // Try interpreting the provided ID as a notification ID to resolve the requestId
      const notif = await Notification.findOne({
        _id: effectiveRequestId,
        post: postId,
        type: "thrift_request",
      });
      if (notif?.requestId) {
        effectiveRequestId = notif.requestId.toString();
        request = post.thriftRequests.id(effectiveRequestId) || post.thriftRequests.id(String(effectiveRequestId));
      }
      // As a final fallback for very old notifications, infer by requester
      if (!request && notif?.fromUser) {
        const candidate = (post.thriftRequests || []).find(
          r => r.requester?.toString() === notif.fromUser.toString()
        );
        if (candidate) {
          if (candidate.status !== 'pending') {
            return res.status(400).json({ error: "Request already processed" });
          }
          effectiveRequestId = candidate._id.toString();
          request = candidate;
        }
      }
    }

    if (!request) return res.status(404).json({ error: "Request not found" });
    if (request.status !== 'pending') {
      return res.status(400).json({ error: "Request already processed" });
    }

    post.thriftRequests.forEach(r => {
      if (r._id.toString() === effectiveRequestId) {
        r.status = 'accepted';
      } else if (r.status === 'pending') {
        r.status = 'declined';
      }
    });
    post.thriftStatus = 'pending';
    await post.save();

    await Notification.create({
      user: request.requester,
      type: "thrift_accepted",
      message: `Your thrift request for '${post.caption}' was accepted!`,
      post: post._id,
      fromUser: userId,
      requestId: effectiveRequestId,
      requestStatus: 'accepted',
    });

    // Create chat for the accepted thrift request
    try {
      const Chat = require("../../models/Chat");
      const chat = new Chat({
        participants: [post.author, request.requester],
        post: post._id,
        thriftRequestId: effectiveRequestId,
        status: 'active'
      });
      await chat.save();
    } catch (chatError) {
      console.error("Error creating chat:", chatError);
      // Don't fail the request if chat creation fails
    }

    for (const r of post.thriftRequests) {
      if (r._id.toString() !== effectiveRequestId && r.status === 'declined') {
        await Notification.create({
          user: r.requester,
          type: "thrift_declined",
          message: `Your thrift request for '${post.caption}' was declined.`,
          post: post._id,
          fromUser: userId,
          requestId: r._id,
          requestStatus: 'declined',
        });
      }
    }
    res.json({ message: "Thrift request accepted", post });
  } catch (err) {
    console.error("Accept thrift request error:", err);
    res.status(500).json({ error: "Failed to accept thrift request" });
  }
};

exports.declineThriftRequest = async (req, res) => {
  try {
    const { postId, requestId } = req.params;
    const userId = req.user._id;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: "Post not found" });
    if (post.author.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Resolve effective request ID, supporting older notifications
    let effectiveRequestId = requestId;
    let request = post.thriftRequests.id(effectiveRequestId) || post.thriftRequests.id(String(effectiveRequestId));

    if (!request) {
      const notif = await Notification.findOne({
        _id: effectiveRequestId,
        post: postId,
        type: "thrift_request",
      });
      if (notif?.requestId) {
        effectiveRequestId = notif.requestId.toString();
        request = post.thriftRequests.id(effectiveRequestId) || post.thriftRequests.id(String(effectiveRequestId));
      }
      if (!request && notif?.fromUser) {
        const candidate = (post.thriftRequests || []).find(
          r => r.requester?.toString() === notif.fromUser.toString()
        );
        if (candidate) {
          if (candidate.status !== 'pending') {
            return res.status(400).json({ error: "Request already processed" });
          }
          effectiveRequestId = candidate._id.toString();
          request = candidate;
        }
      }
    }

    if (!request) return res.status(404).json({ error: "Request not found" });
    if (request.status !== 'pending') {
      return res.status(400).json({ error: "Request already processed" });
    }
    request.status = 'declined';
    await post.save();
    await Notification.create({
      user: request.requester,
      type: "thrift_declined",
      message: `Your thrift request for '${post.caption}' was declined.`,
      post: post._id,
      fromUser: userId,
      requestId: effectiveRequestId,
      requestStatus: 'declined',
    });
    res.json({ message: "Thrift request declined", post });
  } catch (err) {
    console.error("Decline thrift request error:", err);
    res.status(500).json({ error: "Failed to decline thrift request" });
  }
};