const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const WardrobeItem = require("../../models/WardrobeItem");
const User = require("../../models/User");

// Get all wardrobe items for the authenticated user
router.get("/", auth, async (req, res) => {
  try {
    const items = await WardrobeItem.find({ owner: req.user._id });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Add a new wardrobe item
router.post("/", auth, async (req, res) => {
  try {
    const { name, type, image, postId } = req.body;
    
    const item = new WardrobeItem({
      name,
      type,
      image,
      postId,
      owner: req.user._id
    });

    await item.save();
    
    // Add item to user's wardrobe
    req.user.wardrobe.push(item._id);
    await req.user.save();

    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Update a wardrobe item
router.put("/:id", auth, async (req, res) => {
  try {
    const item = await WardrobeItem.findOne({ _id: req.params.id, owner: req.user._id });
    
    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    const { name, type, image } = req.body;
    
    if (name) item.name = name;
    if (type) item.type = type;
    if (image) item.image = image;

    await item.save();
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Delete a wardrobe item
router.delete("/:id", auth, async (req, res) => {
  try {
    const item = await WardrobeItem.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    
    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    // Remove item from user's wardrobe
    req.user.wardrobe = req.user.wardrobe.filter(id => id.toString() !== req.params.id);
    await req.user.save();

    res.json({ message: "Item deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
