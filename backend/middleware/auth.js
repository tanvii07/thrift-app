// middleware/auth.js
const jwt = require("jsonwebtoken");
const User = require("../models/User"); // ✅ Import the User model

const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) throw new Error("No token");

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId || decoded.id;

    if (!userId) throw new Error("Invalid token payload");

    const user = await User.findById(userId); // ✅ Fetch full user from DB
    if (!user) throw new Error("User not found");

    req.user = user; // ✅ Attach full user document
    next();
  } catch (error) {
    console.error("🔴 Auth middleware error:", error.message);
    res.status(401).json({ error: "Please authenticate." });
  }
};

module.exports = auth;
