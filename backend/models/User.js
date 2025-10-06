const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  wardrobe: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "WardrobeItem"
  }],
  likedPosts: [{  // ✅ ADD THIS
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post"
  }],

  profilePic: {
    type: String,
    default: ""
  },
  bio: {
    type: String,
    default: ""
  },
  location: {
    type: String,
    default: ""
  },
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],

}, { timestamps: true });


module.exports = mongoose.model("User", userSchema);
