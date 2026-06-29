import { Router } from 'express';
import { randomUUID } from 'crypto';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../db/init.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();
router.use(authMiddleware);

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads'),
  filename: (req, file, cb) => cb(null, `${randomUUID()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

const PRODUIT_SELECT = `
  SELECT p.*, c.name as categorie, f.name as fournisseur
  FROM produits p
  LEFT JOIN categories c ON p.categorie_id = c.id
  LEFT JOIN fournisseurs f ON p.fournisseur_id = f.id
`;

router.get('/', async (req, res) => {
  try {
    const { categorie, search } = req.query;
    let query = PRODUIT_SELECT;
    const params = [];

    if (categorie && search) {
const conditions = [`(p.archived IS NULL OR p.archived = false)`];
    if (categorie) conditions.push(`c.name = $${params.length + 1}`) && params.push(categorie);
    if (search) conditions.push(`p.denomination ILIKE $${params.length + 1}`) && params.push(`%${search}%`);
    query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY c.name, p.denomination`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/categories', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM categories ORDER BY name`);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/fournisseurs', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM fournisseurs ORDER BY name`);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(`${PRODUIT_SELECT} WHERE p.id = $1`, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Produit introuvable' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id', requireRole('gestionnaire', 'admin'), upload.single('photo'), async (req, res) => {
  try {
    const fields = ['denomination','taille','ref_fournisseur','conditionnement','consommation_mensuelle','dotation','seuil_commande','prix','emplacement_etagere','emplacement_etage','categorie_id','fournisseur_id'];
    const updates = [];
    const vals = [];
    let i = 1;

    fields.forEach(f => {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = $${i++}`);
        vals.push(req.body[f] === '' ? null : req.body[f]);
      }
    });

    if (req.file) {
      updates.push(`photo_url = $${i++}`);
      vals.push(`/uploads/${req.file.filename}`);
    }

    if (updates.length === 0) return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });

    updates.push(`updated_at = NOW()`);
    vals.push(req.params.id);
    await pool.query(`UPDATE produits SET ${updates.join(', ')} WHERE id = $${i}`, vals);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', requireRole('gestionnaire', 'admin'), async (req, res) => {
  try {
    const { denomination, taille, categorie_id, ref_fournisseur, fournisseur_id, conditionnement, consommation_mensuelle, dotation, seuil_commande, prix } = req.body;
    if (!denomination) return res.status(400).json({ error: 'Dénomination requise' });
    const id = randomUUID();
    await pool.query(
      `INSERT INTO produits (id, denomination, taille, categorie_id, ref_fournisseur, fournisseur_id, conditionnement, consommation_mensuelle, dotation, seuil_commande, prix)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [id, denomination, taille||null, categorie_id||null, ref_fournisseur||null, fournisseur_id||null, conditionnement||null, consommation_mensuelle||null, dotation||null, seuil_commande||null, prix||null]
    );
    res.status(201).json({ id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', requireRole('gestionnaire', 'admin'), async (req, res) => {
  try {
    const result = await pool.query(`SELECT id FROM produits WHERE id = $1`, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Produit introuvable' });
    await pool.query(`UPDATE produits SET archived = true, updated_at = NOW() WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;