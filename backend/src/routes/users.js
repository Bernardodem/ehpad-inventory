import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { pool } from '../db/init.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(`SELECT id, username, full_name, role, created_at, active FROM users ORDER BY full_name`);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', requireRole('admin'), async (req, res) => {
  const { username, password, full_name, role } = req.body;
  if (!username || !password || !full_name || !role) return res.status(400).json({ error: 'Tous les champs sont requis' });
  if (!['inventaire', 'gestionnaire', 'admin'].includes(role)) return res.status(400).json({ error: 'Rôle invalide' });
  try {
    const existing = await pool.query(`SELECT id FROM users WHERE username = $1`, [username]);
    if (existing.rows.length > 0) return res.status(409).json({ error: 'Identifiant déjà utilisé' });
    const hash = bcrypt.hashSync(password, 10);
    const id = randomUUID();
    await pool.query(`INSERT INTO users (id, username, password_hash, full_name, role) VALUES ($1,$2,$3,$4,$5)`, [id, username, hash, full_name, role]);
    res.status(201).json({ id, username, full_name, role });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id', requireRole('admin'), async (req, res) => {
  const { full_name, role, active, password } = req.body;
  try {
    if (full_name) await pool.query(`UPDATE users SET full_name = $1 WHERE id = $2`, [full_name, req.params.id]);
    if (role) await pool.query(`UPDATE users SET role = $1 WHERE id = $2`, [role, req.params.id]);
    if (active !== undefined) await pool.query(`UPDATE users SET active = $1 WHERE id = $2`, [active ? 1 : 0, req.params.id]);
    if (password) await pool.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [bcrypt.hashSync(password, 10), req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', requireRole('admin'), async (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
  try {
    await pool.query(`UPDATE users SET active = 0 WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;