const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { requireAuth, redirectIfAuth } = require('../middleware/auth');

// POST /auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({
        error: existingUser.email === email
          ? 'Este email já está em uso.'
          : 'Este username já está em uso.'
      });
    }

    const user = await User.create({ username, email, password, displayName: displayName || username });
    req.session.userId = user._id;

    res.status(201).json({ message: 'Conta criada com sucesso!', user });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ error: messages[0] });
    }
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Email ou senha inválidos.' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ error: 'Email ou senha inválidos.' });

    req.session.userId = user._id;
    res.json({ message: 'Login realizado!', user });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// POST /auth/logout
router.post('/logout', requireAuth, (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Logout realizado com sucesso.' });
  });
});

// GET /auth/me
router.get('/me', async (req, res) => {
  if (!req.session.userId) return res.json({ user: null });
  try {
    const user = await User.findById(req.session.userId).select('-password');
    res.json({ user });
  } catch {
    res.json({ user: null });
  }
});

module.exports = router;
