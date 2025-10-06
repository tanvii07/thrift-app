const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const postSchema = new Schema({
  image: {
    type: String,
    required: false, // Optional image URL
  },
  caption: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['tops', 'jeans_skirts', 'dresses', 'others'],
    default: 'others'
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  isPublic: {
    type: Boolean,
    default: true,
  },
  isThrift: {
    type: Boolean,
    default: false,
  },
  thriftStatus: {
    type: String,
    enum: ['available', 'sold', 'pending'],
    default: 'available'
  },
  thriftPrice: {
    type: Number,
    default: 0
  },
  thriftBuyer: {
    type: Schema.Types.ObjectId,
    ref: "User"
  },
  thriftPurchaseDate: {
    type: Date
  },
  thriftRequests: [{
    requester: {
      type: Schema.Types.ObjectId,
      ref: "User"
    },
    requestDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending'
    }
  }],
  tags: [String],
  likes: [{
    type: Schema.Types.ObjectId,
    ref: "User",
  }],
}, { timestamps: true });

module.exports = mongoose.model("Post", postSchema);
