import { Router } from 'express';
import { randomUUID } from 'crypto';
import { pool } from '../db/init.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// Liste des commandes (avec fournisseur, statut, nb lignes)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, f.name as fournisseur,
        (SELECT COUNT(*) FROM commande_lignes cl WHERE cl.commande_id = c.id) as nb_lignes
      FROM commandes c
      JOIN fournisseurs f ON c.fournisseur_id = f.id
      ORDER BY c.date_validation DESC
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Detail d'une commande avec ses lignes
router.get('/:id', async (req, res) => {
  try {
    const commande = await pool.query(`
      SELECT c.*, f.name as fournisseur
      FROM commandes c JOIN fournisseurs f ON c.fournisseur_id = f.id
      WHERE c.id = $1
    `, [req.params.id]);
    if (commande.rows.length === 0) return res.status(404).json({ error: 'Commande introuvable' });

    const lignes = await pool.query(`
      SELECT cl.*, p.denomination, p.taille, p.conditionnement
      FROM commande_lignes cl JOIN produits p ON cl.produit_id = p.id
      WHERE cl.commande_id = $1
      ORDER BY p.denomination
    `, [req.params.id]);

    const receptions = await pool.query(`
      SELECT cr.*, cl.commande_id
      FROM commande_receptions cr
      JOIN commande_lignes cl ON cr.commande_ligne_id = cl.id
      WHERE cl.commande_id = $1
      ORDER BY cr.date_reception ASC
    `, [req.params.id]);

    const lignesAvecReceptions = lignes.rows.map(l => ({
      ...l,
      receptions: receptions.rows.filter(r => r.commande_ligne_id === l.id)
    }));

    res.json({ ...commande.rows[0], lignes: lignesAvecReceptions });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Valider une commande pour un fournisseur (creation)
router.post('/', requireRole('gestionnaire', 'admin'), async (req, res) => {
  const { fournisseur_id, inventaire_session_id, lignes } = req.body;
  if (!fournisseur_id || !Array.isArray(lignes) || lignes.length === 0) {
    return res.status(400).json({ error: 'Fournisseur et lignes requis' });
  }
  try {
    const commandeId = randomUUID();
    await pool.query(
      `INSERT INTO commandes (id, fournisseur_id, inventaire_session_id, created_by) VALUES ($1,$2,$3,$4)`,
      [commandeId, fournisseur_id, inventaire_session_id || null, req.user.id]
    );
    for (const l of lignes) {
      await pool.query(
        `INSERT INTO commande_lignes (id, commande_id, produit_id, quantite_commandee) VALUES ($1,$2,$3,$4)`,
        [randomUUID(), commandeId, l.produit_id, l.quantite]
      );
    }
    res.status(201).json({ id: commandeId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Reception : maj quantite recue par ligne
router.patch('/:id/lignes/:ligneId', requireRole('gestionnaire', 'admin'), async (req, res) => {
  const { quantite_recue } = req.body;
  try {
    await pool.query(
      `UPDATE commande_lignes SET quantite_recue = $1 WHERE id = $2 AND commande_id = $3`,
      [quantite_recue, req.params.ligneId, req.params.id]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Ajouter une reception partielle sur une ligne
router.post('/:id/lignes/:ligneId/receptions', requireRole('gestionnaire', 'admin'), async (req, res) => {
  const { quantite } = req.body;
  if (!quantite || quantite <= 0) return res.status(400).json({ error: 'Quantité invalide' });
  try {
    const { randomUUID } = await import('crypto');
    const id = randomUUID();
    await pool.query(
      `INSERT INTO commande_receptions (id, commande_ligne_id, quantite) VALUES ($1, $2, $3)`,
      [id, req.params.ligneId, quantite]
    );
    // Mise a jour quantite_recue totale sur la ligne
    await pool.query(
      `UPDATE commande_lignes SET quantite_recue = (
        SELECT COALESCE(SUM(quantite), 0) FROM commande_receptions WHERE commande_ligne_id = $1
      ) WHERE id = $1`,
      [req.params.ligneId]
    );
    res.status(201).json({ id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Finaliser la reception (calcule automatiquement le statut)
router.patch('/:id/receptionner', requireRole('gestionnaire', 'admin'), async (req, res) => {
  try {
    const lignes = await pool.query(`SELECT quantite_commandee, quantite_recue FROM commande_lignes WHERE commande_id = $1`, [req.params.id]);
    const toutesRecues = lignes.rows.every(l => l.quantite_recue !== null && l.quantite_recue >= l.quantite_commandee);
    const status = toutesRecues ? 'recue' : 'recue_partielle';
    await pool.query(`UPDATE commandes SET status = $1, date_reception = NOW() WHERE id = $2`, [status, req.params.id]);
    res.json({ success: true, status });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
