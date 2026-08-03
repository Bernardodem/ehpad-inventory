import { Router } from 'express';
import { randomUUID } from 'crypto';
import { pool } from '../db/init.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

const TABLES = {
  etageres: 'etageres',
  niveaux: 'niveaux',
  emplacements: 'emplacements',
};

function validTable(t) {
  return TABLES[t] || null;
}

router.get('/:type', async (req, res) => {
  const table = validTable(req.params.type);
  if (!table) return res.status(404).json({ error: 'Type invalide' });
  try {
    const result = await pool.query(`SELECT * FROM ${table} ORDER BY ordre, name`);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:type', requireRole('admin'), async (req, res) => {
  const table = validTable(req.params.type);
  if (!table) return res.status(404).json({ error: 'Type invalide' });
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nom requis' });
  try {
    const maxOrdre = await pool.query(`SELECT COALESCE(MAX(ordre), 0) as m FROM ${table}`);
    const id = randomUUID();
    await pool.query(`INSERT INTO ${table} (id, name, ordre) VALUES ($1, $2, $3)`, [id, name, maxOrdre.rows[0].m + 1]);
    res.status(201).json({ id });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Cette valeur existe déjà' });
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:type/:id', requireRole('admin'), async (req, res) => {
  const table = validTable(req.params.type);
  if (!table) return res.status(404).json({ error: 'Type invalide' });
  try {
    await pool.query(`DELETE FROM ${table} WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
