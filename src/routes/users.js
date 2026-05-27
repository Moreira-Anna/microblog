const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Post = require('../models/Post');
const { requireAuth } = require('../middleware/auth');

// GET /users/search?q=
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) return res.json({ users: [] });

    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { displayName: { $regex: query, $options: 'i' } }
      ]
    }).select('username displayName avatar bio followers').limit(10);

    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Erro na busca.' });
  }
});

// GET /users/:username - Perfil do usuário
router.get('/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select('-password')
      .populate('following', 'username displayName avatar')
      .populate('followers', 'username displayName avatar');

    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

    const posts = await Post.find({ author: user._id, replyTo: null })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ user, posts });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar perfil.' });
  }
});

// PUT /users/profile - Editar perfil
router.put('/profile/edit', requireAuth, async (req, res) => {
  try {
    const { displayName, bio } = req.body;
    const updates = {};
    if (displayName !== undefined) updates.displayName = displayName.trim();
    if (bio !== undefined) updates.bio = bio.trim();

    const user = await User.findByIdAndUpdate(
      req.session.userId,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({ user, message: 'Perfil atualizado!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar perfil.' });
  }
});

// POST /users/:username/follow - Seguir/deixar de seguir
router.post('/:username/follow', requireAuth, async (req, res) => {
  try {
    const targetUser = await User.findOne({ username: req.params.username });
    if (!targetUser) return res.status(404).json({ error: 'Usuário não encontrado.' });

    const myId = req.session.userId;
    const targetId = targetUser._id;

    if (myId.toString() === targetId.toString()) {
      return res.status(400).json({ error: 'Você não pode seguir a si mesmo.' });
    }

    const me = await User.findById(myId);
    const isFollowing = me.following.some(id => id.toString() === targetId.toString());

    if (isFollowing) {
      await User.findByIdAndUpdate(myId, { $pull: { following: targetId } });
      await User.findByIdAndUpdate(targetId, { $pull: { followers: myId } });
      res.json({ following: false, followersCount: targetUser.followers.length - 1 });
    } else {
      await User.findByIdAndUpdate(myId, { $addToSet: { following: targetId } });
      await User.findByIdAndUpdate(targetId, { $addToSet: { followers: myId } });
      res.json({ following: true, followersCount: targetUser.followers.length + 1 });
    }
  } catch (err) {
    res.status(500).json({ error: 'Erro ao seguir usuário.' });
  }
});

module.exports = router;
