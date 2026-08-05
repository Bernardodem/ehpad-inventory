import { Router } from 'express';
import { randomUUID } from 'crypto';
import { pool } from '../db/init.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM lieux_stockage ORDER BY ordre, name');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', requireRole('admin'), async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Nom requis' });
  try {
    const maxOrdre = await pool.query('SELECT COALESCE(MAX(ordre), 0) as m FROM lieux_stockage');
    const id = randomUUID();
    await pool.query('INSERT INTO lieux_stockage (id, name, description, ordre) VALUES ($1,$2,$3,$4)',
      [id, name, description || null, maxOrdre.rows[0].m + 1]);
    res.status(201).json({ id });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Ce lieu existe deja' });
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM lieux_stockage WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/produits', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, pl.dotation as dotation_lieu, pl.seuil_commande as seuil_lieu, pl.id as produit_lieu_id
      FROM produits p
      JOIN produit_lieu pl ON pl.produit_id = p.id
      WHERE pl.lieu_id = $1 AND p.archived = false
      ORDER BY p.denomination
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/produits', requireRole('gestionnaire', 'admin'), async (req, res) => {
  const { produit_id, dotation, seuil_commande, emplacement_etagere, emplacement_etage, emplacement } = req.body;
  if (!produit_id) return res.status(400).json({ error: 'Produit requis' });
  try {
    const id = randomUUID();
    await pool.query(
      `INSERT INTO produit_lieu (id, produit_id, lieu_id, dotation, seuil_commande, emplacement_etagere, emplacement_etage, emplacement)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (produit_id, lieu_id) DO UPDATE SET dotation=$4, seuil_commande=$5, emplacement_etagere=$6, emplacement_etage=$7, emplacement=$8`,
      [id, produit_id, req.params.id, dotation || null, seuil_commande || null, emplacement_etagere || null, emplacement_etage || null, emplacement || null]
    );
    res.status(201).json({ id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id/produits/:produitLieuId', requireRole('gestionnaire', 'admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM produit_lieu WHERE id = $1 AND lieu_id = $2', [req.params.produitLieuId, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
