const mongoose = require("mongoose");

const wardrobeItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, default: "other" },
  image: { type: String, default: "" },
  // Optional link back to a post so users can request thrift later
  postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model("WardrobeItem", wardrobeItemSchema);
