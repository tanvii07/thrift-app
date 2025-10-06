const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const Outfit = require('../../models/Outfit');

// Get all outfits (public ones and user's private ones)
router.get('/', auth, async (req, res) => {
  try {
    const outfits = await Outfit.find({
      $or: [
        { isPublic: true },
        { creator: req.user._id }
      ]
    }).populate('items creator', 'name type image username');
    
    res.json(outfits);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a specific outfit
router.get('/:id', auth, async (req, res) => {
  try {
    const outfit = await Outfit.findOne({
      _id: req.params.id,
      $or: [
        { isPublic: true },
        { creator: req.user._id }
      ]
    }).populate('items creator', 'name type image username');

    if (!outfit) {
      return res.status(404).json({ error: 'Outfit not found' });
    }

    res.json(outfit);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a new outfit
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, items, isPublic, tags } = req.body;

    const outfit = new Outfit({
      name,
      description,
      items,
      creator: req.user._id,
      isPublic,
      tags
    });

    await outfit.save();
    res.status(201).json(outfit);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update an outfit
router.put('/:id', auth, async (req, res) => {
  try {
    const outfit = await Outfit.findOne({ _id: req.params.id, creator: req.user._id });
    
    if (!outfit) {
      return res.status(404).json({ error: 'Outfit not found' });
    }

    const { name, description, items, isPublic, tags } = req.body;
    
    if (name) outfit.name = name;
    if (description) outfit.description = description;
    if (items) outfit.items = items;
    if (typeof isPublic === 'boolean') outfit.isPublic = isPublic;
    if (tags) outfit.tags = tags;

    await outfit.save();
    res.json(outfit);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete an outfit
router.delete('/:id', auth, async (req, res) => {
  try {
    const outfit = await Outfit.findOneAndDelete({ _id: req.params.id, creator: req.user._id });
    
    if (!outfit) {
      return res.status(404).json({ error: 'Outfit not found' });
    }

    res.json({ message: 'Outfit deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Like/Unlike an outfit
router.post('/:id/like', auth, async (req, res) => {
  try {
    const outfit = await Outfit.findById(req.params.id);
    
    if (!outfit) {
      return res.status(404).json({ error: 'Outfit not found' });
    }

    const likeIndex = outfit.likes.indexOf(req.user._id);
    
    if (likeIndex === -1) {
      outfit.likes.push(req.user._id);
    } else {
      outfit.likes.splice(likeIndex, 1);
    }

    await outfit.save();
    res.json(outfit);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router; 