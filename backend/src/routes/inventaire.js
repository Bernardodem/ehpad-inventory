import { Router } from 'express';
import { randomUUID } from 'crypto';
import { getDb } from '../db/init.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// Sessions d'inventaire
router.get('/sessions', (req, res) => {
  const db = getDb();
  const sessions = db.prepare(`
    SELECT s.*, u.full_name as created_by_name
    FROM inventaire_sessions s
    LEFT JOIN users u ON s.created_by = u.id
    ORDER BY s.created_at DESC LIMIT 20
  `).all();
  res.json(sessions);
});

router.post('/sessions', requireRole('inventaire', 'gestionnaire', 'admin'), (req, res) => {
  const { label, type, categories } = req.body;
  if (!label || !type) return res.status(400).json({ error: 'Label et type requis' });
  const db = getDb();
  const id = randomUUID();
  db.prepare(`
    INSERT INTO inventaire_sessions (id, label, type, categories, created_by)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, label, type, categories ? JSON.stringify(categories) : null, req.user.id);
  res.status(201).json({ id });
});

router.patch('/sessions/:id/finish', requireRole('inventaire', 'gestionnaire', 'admin'), (req, res) => {
  const db = getDb();
  db.prepare(`UPDATE inventaire_sessions SET status = 'termine', finished_at = datetime('now') WHERE id = ?`).run(req.params.id);
  res.json({ success: true });
});

// Lignes d'inventaire
router.get('/sessions/:sessionId/lignes', (req, res) => {
  const db = getDb();
  const lignes = db.prepare(`
    SELECT i.*, p.denomination, p.conditionnement, p.dotation, p.seuil_commande,
           c.name as categorie
    FROM inventaires i
    JOIN produits p ON i.produit_id = p.id
    LEFT JOIN categories c ON p.categorie_id = c.id
    WHERE i.inventaire_session_id = ?
    ORDER BY c.name, p.denomination
  `).all(req.params.sessionId);
  res.json(lignes);
});

router.post('/sessions/:sessionId/lignes', requireRole('inventaire', 'gestionnaire', 'admin'), (req, res) => {
  const { produit_id, quantite, date_peremption } = req.body;
  if (produit_id === undefined || quantite === undefined) return res.status(400).json({ error: 'produit_id et quantite requis' });
  const db = getDb();

  // Upsert: si déjà saisie dans cette session, on remplace
  const existing = db.prepare(`SELECT id FROM inventaires WHERE produit_id = ? AND inventaire_session_id = ?`).get(produit_id, req.params.sessionId);
  if (existing) {
    db.prepare(`UPDATE inventaires SET quantite = ?, date_peremption = ? WHERE id = ?`).run(quantite, date_peremption||null, existing.id);
    return res.json({ id: existing.id, updated: true });
  }

  const id = randomUUID();
  db.prepare(`
    INSERT INTO inventaires (id, produit_id, quantite, date_peremption, inventaire_session_id, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, produit_id, quantite, date_peremption||null, req.params.sessionId, req.user.id);
  res.status(201).json({ id });
});

// Vue commande : basée sur le dernier inventaire terminé
router.get('/commande', requireRole('gestionnaire', 'admin'), (req, res) => {
  const db = getDb();

  // Dernière session terminée
  const lastSession = db.prepare(`SELECT id FROM inventaire_sessions WHERE status = 'termine' ORDER BY finished_at DESC LIMIT 1`).get();

  if (!lastSession) return res.json({ session: null, lignes: [] });

  const lignes = db.prepare(`
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
        THEN MAX(0, CAST(p.dotation AS REAL) - CAST(i.quantite AS REAL))
        ELSE NULL
      END as qte_a_commander,
      c.name as categorie
    FROM produits p
    LEFT JOIN inventaires i ON i.produit_id = p.id AND i.inventaire_session_id = ?
    LEFT JOIN categories c ON p.categorie_id = c.id
    LEFT JOIN fournisseurs f ON p.fournisseur_id = f.id
    WHERE p.dotation IS NOT NULL
    ORDER BY c.name, p.denomination
  `).all(lastSession.id);

  res.json({ session_id: lastSession.id, lignes });
});

export default router;
