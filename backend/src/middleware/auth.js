import jwt from 'jsonwebtoken';

const SSO_SECRET = process.env.SSO_JWT_SECRET || 'SsoSecretMonArcEnCiel2024';
const JWT_SECRET = process.env.JWT_SECRET || 'ehpad-arc-en-ciel-secret-2024';

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' });
  }
  try {
    const token = header.slice(7);
    // Essaie d'abord le secret SSO, puis le secret local
    try {
      req.user = jwt.verify(token, SSO_SECRET);
    } catch {
      req.user = jwt.verify(token, JWT_SECRET);
    }
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    const role = req.user.role || req.user.role_global;
    if (!roles.includes(role)) {
      return res.status(403).json({ error: 'Accès interdit' });
    }
    next();
  };
}

export function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, full_name: user.full_name },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
}
