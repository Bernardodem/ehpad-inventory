import jwt from 'jsonwebtoken';

// Secret partage avec le SSO, qui signe les jetons (jamais de valeur par defaut dans le code)
const SSO_SECRET = process.env.SSO_JWT_SECRET;
if (!SSO_SECRET) throw new Error('SSO_JWT_SECRET manquant dans le .env');

// Identifiant de l'application "Gestion des stocks" dans le SSO
const STOCKS_APP_ID = process.env.STOCKS_APP_ID;
if (!STOCKS_APP_ID) throw new Error('STOCKS_APP_ID manquant dans le .env');

// Roles du SSO -> roles de l'appli stocks
const SSO_ROLES = { utilisateur: 'inventaire', gestionnaire: 'gestionnaire', admin: 'admin' };

function resolveRole(user) {
  if (['admin_groupe', 'admin_etablissement'].includes(user.role_global)) return 'admin';
  const app = (user.apps || []).find(a => a.id === STOCKS_APP_ID);
  return SSO_ROLES[app?.role] || null;
}

// Jeton SSO valide, sans exiger d'acces a l'appli stocks : pour les autres applis du groupe
export function ssoTokenMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' });
  }
  try {
    req.user = jwt.verify(header.slice(7), SSO_SECRET);
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
  next();
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' });
  }
  try {
    req.user = jwt.verify(header.slice(7), SSO_SECRET);
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
  // Pas d'acces accorde a l'appli stocks dans le SSO : refus
  req.user.role = resolveRole(req.user);
  if (!req.user.role) {
    return res.status(403).json({ error: 'Accès à la gestion des stocks non autorisé' });
  }
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès interdit' });
    }
    next();
  };
}
