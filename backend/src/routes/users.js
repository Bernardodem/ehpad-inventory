import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { getDb } from '../db/init.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', requireRole('admin'), (req, res) => {
  const db = getDb();
  const users = db.prepare(`SELECT id, username, full_name, role, created_at, active FROM users ORDER BY full_name`).all();
  res.json(users);
});

router.post('/', requireRole('admin'), (req, res) => {
  const { username, password, full_name, role } = req.body;
  if (!username || !password || !full_name || !role) return res.status(400).json({ error: 'Tous les champs sont requis' });
  if (!['inventaire', 'gestionnaire', 'admin'].includes(role)) return res.status(400).json({ error: 'Rôle invalide' });

  const db = getDb();
  const existing = db.prepare(`SELECT id FROM users WHERE username = ?`).get(username);
  if (existing) return res.status(409).json({ error: 'Identifiant déjà utilisé' });

  const hash = bcrypt.hashSync(password, 10);
  const id = randomUUID();
  db.prepare(`INSERT INTO users (id, username, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)`).run(id, username, hash, full_name, role);
  res.status(201).json({ id, username, full_name, role });
});

router.patch('/:id', requireRole('admin'), (req, res) => {
  const { full_name, role, active, password } = req.body;
  const db = getDb();
  const user = db.prepare(`SELECT id FROM users WHERE id = ?`).get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

  if (full_name) db.prepare(`UPDATE users SET full_name = ? WHERE id = ?`).run(full_name, req.params.id);
  if (role) db.prepare(`UPDATE users SET role = ? WHERE id = ?`).run(role, req.params.id);
  if (active !== undefined) db.prepare(`UPDATE users SET active = ? WHERE id = ?`).run(active ? 1 : 0, req.params.id);
  if (password) {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(hash, req.params.id);
  }
  res.json({ success: true });
});

router.delete('/:id', requireRole('admin'), (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
  const db = getDb();
  db.prepare(`UPDATE users SET active = 0 WHERE id = ?`).run(req.params.id);
  res.json({ success: true });
});

export default router;
