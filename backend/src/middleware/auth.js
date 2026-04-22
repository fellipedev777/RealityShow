const jwt = require('jsonwebtoken');
const supabase = require('../config/database');

const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token não fornecido' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, photo_url, is_admin, is_active, is_eliminated')
      .eq('id', decoded.id)
      .single();

    if (error || !user) return res.status(401).json({ error: 'Usuário não encontrado' });
    if (!user.is_active) return res.status(403).json({ error: 'Conta desativada' });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

const adminOnly = (req, res, next) => {
  if (!req.user?.is_admin) {
    return res.status(403).json({ error: 'Acesso restrito ao administrador' });
  }
  next();
};

module.exports = { auth, adminOnly };
