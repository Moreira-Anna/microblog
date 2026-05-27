const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const User = require('../models/User');

// GET /api/search?q= - Busca geral
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query || query.trim().length < 2) {
      return res.json({ posts: [], users: [] });
    }

    // Verificar se é hashtag
    if (query.startsWith('#')) {
      const tag = query.slice(1).toLowerCase();
      const posts = await Post.find({ hashtags: tag })
        .populate('author', 'username displayName avatar')
        .sort({ createdAt: -1 })
        .limit(20);
      return res.json({ posts, users: [], hashtag: tag });
    }

    const [posts, users] = await Promise.all([
      Post.find({ content: { $regex: query, $options: 'i' }, replyTo: null })
        .populate('author', 'username displayName avatar')
        .sort({ createdAt: -1 })
        .limit(10),
      User.find({
        $or: [
          { username: { $regex: query, $options: 'i' } },
          { displayName: { $regex: query, $options: 'i' } }
        ]
      }).select('username displayName avatar bio').limit(5)
    ]);

    res.json({ posts, users });
  } catch (err) {
    res.status(500).json({ error: 'Erro na busca.' });
  }
});

// GET /api/trending - Hashtags em alta
router.get('/trending', async (req, res) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // últimas 24h
    const trending = await Post.aggregate([
      { $match: { createdAt: { $gte: since }, hashtags: { $exists: true, $ne: [] } } },
      { $unwind: '$hashtags' },
      { $group: { _id: '$hashtags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    res.json({ trending });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar trending.' });
  }
});

// GET /api/stats - Estatísticas gerais
router.get('/stats', async (req, res) => {
  try {
    const [totalUsers, totalPosts] = await Promise.all([
      User.countDocuments(),
      Post.countDocuments({ replyTo: null })
    ]);
    res.json({ totalUsers, totalPosts });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar stats.' });
  }
});

module.exports = router;
