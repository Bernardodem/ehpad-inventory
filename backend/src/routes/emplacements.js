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
    const { lieu_id } = req.query;
    let query = `SELECT * FROM ${table}`;
    const params = [];
    if (lieu_id) { query += ` WHERE lieu_id = $1`; params.push(lieu_id); }
    query += ` ORDER BY ordre, name`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:type', requireRole('admin'), async (req, res) => {
  const table = validTable(req.params.type);
  if (!table) return res.status(404).json({ error: 'Type invalide' });
  const { name, lieu_id } = req.body;
  if (!name) return res.status(400).json({ error: 'Nom requis' });
  try {
    const maxOrdre = await pool.query(`SELECT COALESCE(MAX(ordre), 0) as m FROM ${table}${lieu_id ? ' WHERE lieu_id = $1' : ''}`, lieu_id ? [lieu_id] : []);
    const id = randomUUID();
    await pool.query(`INSERT INTO ${table} (id, name, ordre, lieu_id) VALUES ($1, $2, $3, $4)`, [id, name, maxOrdre.rows[0].m + 1, lieu_id || null]);
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
