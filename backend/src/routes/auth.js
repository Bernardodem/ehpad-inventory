import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db/init.js';
import { signToken, authMiddleware } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Identifiant et mot de passe requis' });

  try {
    const result = await pool.query(`SELECT * FROM users WHERE username = $1 AND active = 1`, [username]);
    const user = result.rows[0];
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });
    }
    const token = signToken(user);
    res.json({ token, user: { id: user.id, username: user.username, full_name: user.full_name, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', authMiddleware, (req, res) => {
  res.json(req.user);
});

export default router;