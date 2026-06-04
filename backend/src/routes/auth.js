import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from '../db/init.js';
import { signToken, authMiddleware } from '../middleware/auth.js';

const router = Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Identifiant et mot de passe requis' });

  const db = getDb();
  const user = db.prepare(`SELECT * FROM users WHERE username = ? AND active = 1`).get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });
  }

  const token = signToken(user);
  res.json({ token, user: { id: user.id, username: user.username, full_name: user.full_name, role: user.role } });
});

router.get('/me', authMiddleware, (req, res) => {
  res.json(req.user);
});

router.get('/reset-admin', async (req, res) => {
  const db = getDb();
  const hash = bcrypt.hashSync('Admin2024!', 10);
  db.prepare(`UPDATE users SET password_hash = ? WHERE username = 'admin'`).run(hash);
  res.json({ success: true, message: 'Mot de passe admin réinitialisé' });
});

export default router;
