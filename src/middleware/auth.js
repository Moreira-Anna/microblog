const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Você precisa estar logado para isso.' });
  }
  next();
};

const redirectIfAuth = (req, res, next) => {
  if (req.session.userId) {
    return res.redirect('/');
  }
  next();
};

module.exports = { requireAuth, redirectIfAuth };
