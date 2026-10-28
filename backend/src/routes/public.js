import { Router } from 'express';
import { pool } from '../db/init.js';
import { ssoTokenMiddleware } from '../middleware/auth.js';

// Lecture seule pour les autres applis du groupe (ex. dotation protections de l'appli residents) :
// seulement les noms et conditionnements, rien de sensible
const router = Router();
router.use(ssoTokenMiddleware);

router.get('/conditionnements', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, denomination, appellation_interne, taille,
             conditionnement_type, conditionnement_quantite, conditionnement_quantite_non_precisee
      FROM produits
      WHERE archived IS NOT TRUE
      ORDER BY denomination
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
