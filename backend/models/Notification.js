const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const notificationSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  type: {
    type: String,
    enum: ["thrift_request", "thrift_accepted", "thrift_declined"],
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  post: {
    type: Schema.Types.ObjectId,
    ref: "Post",
  },
  fromUser: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  // Link to the specific thrift request on the post
  requestId: {
    type: Schema.Types.ObjectId,
    required: false,
  },
  // Current status of the thrift request from the seller's perspective
  requestStatus: {
    type: String,
    enum: ["pending", "accepted", "declined"],
    required: false,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Notification", notificationSchema);