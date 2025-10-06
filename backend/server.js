require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const postRoutes = require("./api/posts/postRoutes");
const authRoutes = require("./api/auth/authRoutes");
const wardrobeRoutes = require("./api/wardrobe/wardrobeRoutes");
const outfitRoutes = require("./api/outfits/outfitRoutes");
const aiRoutes = require("./api/ai/aiRoutes");
const followRoutes = require("./api/users/followRoutes");
const userRoutes = require("./api/users/userRoutes");
const chatRoutes = require("./api/chat/chatRoutes");

const app = express();
app.use(express.json());
app.use(cors());

app.use("/api/posts", postRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/wardrobe", wardrobeRoutes);
app.use("/api/outfits", outfitRoutes); 
app.use("/api/ai", aiRoutes);
app.use("/api/users", followRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes);

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(process.env.PORT || 5000, () =>
      console.log("Server running on port", process.env.PORT || 5000)
    );
  })
  .catch(err => console.error("MongoDB connection error:", err));
