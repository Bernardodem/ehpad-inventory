import { Router } from 'express';
import { randomUUID } from 'crypto';
import { pool } from '../db/init.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/sessions', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, u.full_name as created_by_name
      FROM inventaire_sessions s
      LEFT JOIN users u ON s.created_by = u.id
      ORDER BY s.created_at DESC LIMIT 20
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/sessions', requireRole('inventaire', 'gestionnaire', 'admin'), async (req, res) => {
  const { label, type, categories } = req.body;
  if (!label || !type) return res.status(400).json({ error: 'Label et type requis' });
  try {
    const id = randomUUID();
    await pool.query(
      `INSERT INTO inventaire_sessions (id, label, type, categories, created_by) VALUES ($1,$2,$3,$4,$5)`,
      [id, label, type, categories ? JSON.stringify(categories) : null, req.user.id]
    );
    res.status(201).json({ id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/sessions/:id/finish', requireRole('inventaire', 'gestionnaire', 'admin'), async (req, res) => {
  try {
    await pool.query(`UPDATE inventaire_sessions SET status = 'termine', finished_at = NOW() WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/sessions/:sessionId/lignes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT i.*, p.denomination, p.conditionnement, p.dotation, p.seuil_commande,
             c.name as categorie
      FROM inventaires i
      JOIN produits p ON i.produit_id = p.id
      LEFT JOIN categories c ON p.categorie_id = c.id
      WHERE i.inventaire_session_id = $1
      ORDER BY c.name, p.denomination
    `, [req.params.sessionId]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/sessions/:sessionId/lignes', requireRole('inventaire', 'gestionnaire', 'admin'), async (req, res) => {
  const { produit_id, quantite, date_peremption } = req.body;
  if (produit_id === undefined || quantite === undefined) return res.status(400).json({ error: 'produit_id et quantite requis' });
  try {
    const existing = await pool.query(
      `SELECT id FROM inventaires WHERE produit_id = $1 AND inventaire_session_id = $2`,
      [produit_id, req.params.sessionId]
    );
    if (existing.rows.length > 0) {
      await pool.query(`UPDATE inventaires SET quantite = $1, date_peremption = $2 WHERE id = $3`,
        [quantite, date_peremption||null, existing.rows[0].id]);
      return res.json({ id: existing.rows[0].id, updated: true });
    }
    const id = randomUUID();
    await pool.query(
      `INSERT INTO inventaires (id, produit_id, quantite, date_peremption, inventaire_session_id, created_by) VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, produit_id, quantite, date_peremption||null, req.params.sessionId, req.user.id]
    );
    res.status(201).json({ id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/commande', requireRole('gestionnaire', 'admin'), async (req, res) => {
  try {
    const lastSession = await pool.query(
      `SELECT id FROM inventaire_sessions WHERE status = 'termine' ORDER BY finished_at DESC LIMIT 1`
    );
    if (lastSession.rows.length === 0) return res.json({ session: null, lignes: [] });

    const sessionId = lastSession.rows[0].id;
    const result = await pool.query(`
      SELECT
        p.id as produit_id,
        p.denomination,
        p.taille,
        p.conditionnement,
        p.ref_fournisseur,
        f.name as fournisseur,
        p.dotation,
        p.seuil_commande,
        p.prix,
        i.quantite as stock_actuel,
        i.date_peremption,
        CASE
          WHEN p.dotation IS NOT NULL AND i.quantite IS NOT NULL
          THEN GREATEST(0, CAST(p.dotation AS REAL) - CAST(i.quantite AS REAL))
          ELSE NULL
        END as qte_a_commander,
        c.name as categorie
      FROM produits p
      LEFT JOIN inventaires i ON i.produit_id = p.id AND i.inventaire_session_id = $1
      LEFT JOIN categories c ON p.categorie_id = c.id
      LEFT JOIN fournisseurs f ON p.fournisseur_id = f.id
      WHERE p.dotation IS NOT NULL
      ORDER BY c.name, p.denomination
    `, [sessionId]);

    res.json({ session_id: sessionId, lignes: result.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;