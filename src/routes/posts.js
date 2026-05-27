const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

// GET /posts/feed - Feed do usuário logado
router.get('/feed', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    const following = [...user.following, user._id];

    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const posts = await Post.find({ author: { $in: following }, replyTo: null })
      .populate('author', 'username displayName avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Post.countDocuments({ author: { $in: following }, replyTo: null });

    res.json({ posts, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar feed.' });
  }
});

// GET /posts/explore - Posts públicos
router.get('/explore', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const posts = await Post.find({ replyTo: null })
      .populate('author', 'username displayName avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Post.countDocuments({ replyTo: null });
    res.json({ posts, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar posts.' });
  }
});

// GET /posts/hashtag/:tag
router.get('/hashtag/:tag', async (req, res) => {
  try {
    const tag = req.params.tag.toLowerCase();
    const posts = await Post.find({ hashtags: tag, replyTo: null })
      .populate('author', 'username displayName avatar')
      .sort({ createdAt: -1 })
      .limit(30);
    res.json({ posts, hashtag: tag });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar hashtag.' });
  }
});

// POST /posts - Criar post
router.post('/', requireAuth, async (req, res) => {
  try {
    const { content, replyTo } = req.body;
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Conteúdo não pode ser vazio.' });
    }

    const postData = { author: req.session.userId, content: content.trim() };
    if (replyTo) postData.replyTo = replyTo;

    const post = await Post.create(postData);
    await post.populate('author', 'username displayName avatar');

    // Atualizar contador de posts do usuário
    await User.findByIdAndUpdate(req.session.userId, { $inc: { postsCount: 1 } });

    // Se é uma resposta, adicionar nas replies do post pai
    if (replyTo) {
      await Post.findByIdAndUpdate(replyTo, {
        $push: { replies: post._id },
        $inc: { repliesCount: 1 }
      });
    }

    res.status(201).json({ post });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: Object.values(err.errors)[0].message });
    }
    res.status(500).json({ error: 'Erro ao criar post.' });
  }
});

// GET /posts/:id - Detalhes do post + replies
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'username displayName avatar bio')
      .populate({
        path: 'replies',
        populate: { path: 'author', select: 'username displayName avatar' },
        options: { sort: { createdAt: 1 } }
      })
      .populate('replyTo');

    if (!post) return res.status(404).json({ error: 'Post não encontrado.' });
    res.json({ post });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar post.' });
  }
});

// DELETE /posts/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post não encontrado.' });
    if (post.author.toString() !== req.session.userId.toString()) {
      return res.status(403).json({ error: 'Sem permissão.' });
    }

    await Post.findByIdAndDelete(req.params.id);
    await User.findByIdAndUpdate(req.session.userId, { $inc: { postsCount: -1 } });

    if (post.replyTo) {
      await Post.findByIdAndUpdate(post.replyTo, {
        $pull: { replies: post._id },
        $inc: { repliesCount: -1 }
      });
    }

    res.json({ message: 'Post deletado.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar post.' });
  }
});

// POST /posts/:id/like - Curtir/descurtir
router.post('/:id/like', requireAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post não encontrado.' });

    const userId = req.session.userId;
    const alreadyLiked = post.likes.some(id => id.toString() === userId.toString());

    if (alreadyLiked) {
      await Post.findByIdAndUpdate(req.params.id, {
        $pull: { likes: userId },
        $inc: { likesCount: -1 }
      });
      res.json({ liked: false, likesCount: post.likesCount - 1 });
    } else {
      await Post.findByIdAndUpdate(req.params.id, {
        $addToSet: { likes: userId },
        $inc: { likesCount: 1 }
      });
      res.json({ liked: true, likesCount: post.likesCount + 1 });
    }
  } catch (err) {
    res.status(500).json({ error: 'Erro ao curtir post.' });
  }
});

// POST /posts/:id/repost
router.post('/:id/repost', requireAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post não encontrado.' });

    const userId = req.session.userId;
    const alreadyReposted = post.reposts.some(id => id.toString() === userId.toString());

    if (alreadyReposted) {
      await Post.findByIdAndUpdate(req.params.id, {
        $pull: { reposts: userId },
        $inc: { repostsCount: -1 }
      });
      res.json({ reposted: false, repostsCount: post.repostsCount - 1 });
    } else {
      await Post.findByIdAndUpdate(req.params.id, {
        $addToSet: { reposts: userId },
        $inc: { repostsCount: 1 }
      });
      res.json({ reposted: true, repostsCount: post.repostsCount + 1 });
    }
  } catch (err) {
    res.status(500).json({ error: 'Erro ao repostar.' });
  }
});

module.exports = router;
