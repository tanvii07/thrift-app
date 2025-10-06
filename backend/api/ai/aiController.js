const Post = require("../../models/Post");
const WardrobeItem = require("../../models/WardrobeItem");

exports.getSuggestedOutfits = async (req, res) => {
  try {
    const user = req.user;

    // Combine user's liked + own posts for tags; wardrobe items for types
    const likedAndOwn = [
      ...(user.likedPosts || []),
    ];

    const posts = likedAndOwn.length
      ? await Post.find({ _id: { $in: likedAndOwn } })
      : [];

    const wardrobeItems = await WardrobeItem.find({ owner: user._id });

    // Flatten tags and types and count frequency
    const tagFrequency = {};
    posts.forEach(post => {
      (post.tags || []).forEach(tag => {
        const t = String(tag).replace(/^#/,'').toLowerCase();
        if (!t) return;
        tagFrequency[t] = (tagFrequency[t] || 0) + 1;
      });
    });
    wardrobeItems.forEach(item => {
      const t = String(item.type || '').toLowerCase().trim();
      if (t) tagFrequency[t] = (tagFrequency[t] || 0) + 1;
    });

    const topTags = Object.entries(tagFrequency)
      .sort((a, b) => b[1] - a[1]) // sort by frequency
      .slice(0, 5)
      .map(([tag]) => tag);

    // Suggest public posts with these tags
    const suggestions = await Post.find({
      isPublic: true,
      $or: [
        { tags: { $in: topTags } },
        // heuristic: match caption words
        { caption: { $regex: topTags.join('|'), $options: 'i' } },
      ],
      author: { $ne: user._id }
    })
      .limit(10)
      .populate("author", "username");

    res.json(suggestions);
  } catch (err) {
    console.error("AI Suggestion error:", err);
    res.status(500).json({ error: "Failed to generate suggestions" });
  }
};

// POST /api/ai/outfit
// Body: { context: string }
exports.buildOutfit = async (req, res) => {
  try {
    const { context } = req.body || {};
    // Pull from public thriftable posts; match context keywords if provided
    const match = { isPublic: true, isThrift: true };
    const allPosts = await Post.find(match).sort({ createdAt: -1 }).limit(150).lean();

    // Tokenize context into keywords and remove common stopwords
    const raw = String(context || '').toLowerCase();
    const stopwords = new Set(['a','an','the','for','with','and','or','of','on','to','in','at','by','day','outfit','look','style']);
    const keywords = raw
      .split(/[^a-z0-9#+]+/)
      .filter(Boolean)
      .filter(w => !stopwords.has(w));

    // Simple hash so different contexts produce different tie-break ordering
    const hash = (s) => {
      let h = 0;
      for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
      return h;
    };
    const contextHash = hash(raw);

    // Score posts by keyword matches in caption/tags; small recency bias
    const now = Date.now();
    const scored = allPosts.map((p) => {
      const text = `${p.caption || ''} ${(Array.isArray(p.tags) ? p.tags.join(' ') : '')}`.toLowerCase();
      let score = 0;
      for (const k of keywords) {
        if (!k) continue;
        if (text.includes(k)) score += 3; // keyword hit
      }
      // Recency bonus (last 30 days)
      const ageDays = Math.min(30, Math.max(0, (now - new Date(p.createdAt).getTime()) / (1000*60*60*24)));
      score += Math.max(0, 3 - ageDays / 10);
      // Category/tag diversity bonus
      if (Array.isArray(p.tags) && p.tags.length > 0) score += 0.5;
      return { post: p, score };
    });

    // Order by score, then deterministic tie-break using context
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const ha = hash(String(a.post._id) + contextHash);
      const hb = hash(String(b.post._id) + contextHash);
      return hb - ha; // stable but context-dependent
    });

    // Build up to two suggestions with diverse items each
    const makeSuggestion = (pool, startIndex) => {
      const usedTypes = new Set();
      const items = [];
      for (let i = startIndex; i < pool.length; i++) {
        const p = pool[i].post;
        const primary = (Array.isArray(p.tags) && p.tags[0]) || p.category || 'item';
        const key = String(primary).toLowerCase();
        if (usedTypes.has(key)) continue;
        items.push({ name: p.caption || 'Untitled', type: key, image: p.image, postId: p._id });
        usedTypes.add(key);
        if (items.length >= 4) break;
      }
      const description = `Outfit idea${context ? ` for ${context}` : ''}: Combine ` +
        (items.length ? items.map(i => `${i.type} (${i.name})`).join(', ') : 'a curated selection from recent thrift posts') +
        `. Balanced silhouettes and colors drawn from community posts.`;
      return { items, description };
    };

    const suggestions = [];
    if (scored.length > 0) suggestions.push(makeSuggestion(scored, 0));
    if (scored.length > 4) suggestions.push(makeSuggestion(scored, 4));

    // Back-compat: include first suggestion as top-level as well
    const first = suggestions[0] || { items: [], description: '' };

    res.json({
      context: context || null,
      items: first.items,
      description: first.description,
      suggestions,
      imageUrl: null,
    });
  } catch (err) {
    console.error('AI build outfit error:', err);
    res.status(500).json({ error: 'Failed to build outfit' });
  }
};
