import { Router } from 'express';
import { randomUUID } from 'crypto';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import fs from 'fs/promises';
import { pool } from '../db/init.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();
router.use(authMiddleware);

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads'),
  filename: (req, file, cb) => cb(null, `${randomUUID()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } });

const convertToJpeg = async (filePath) => {
  const jpegPath = filePath.replace(/\.[^.]+$/, '') + '_converted.jpg';
  await sharp(filePath).rotate().jpeg({ quality: 85 }).toFile(jpegPath);
  await fs.unlink(filePath);
  return jpegPath;
};

// Conditionnement : un sachet, un carton ou une boite exige un nombre d'unites,
// sauf si celui-ci est explicitement declare non precise
const CONDITIONNEMENT_TYPES = ['unite', 'sachet', 'carton', 'boite'];

function normaliserConditionnement(type, quantite, nonPrecisee) {
  type = type || 'unite';
  if (!CONDITIONNEMENT_TYPES.includes(type)) return { error: 'Type de conditionnement inconnu' };
  if (type === 'unite') return { type, quantite: null, nonPrecisee: false };
  if (nonPrecisee === true || nonPrecisee === 'true') return { type, quantite: null, nonPrecisee: true };
  const n = Number(quantite);
  if (!Number.isInteger(n) || n < 1) return { error: "Nombre d'unités requis (ou cocher « non précisé »)" };
  return { type, quantite: n, nonPrecisee: false };
}

const PRODUIT_SELECT = `
  SELECT p.*, c.name as categorie, f.name as fournisseur,
    (SELECT i.date_peremption FROM inventaires i WHERE i.produit_id = p.id AND i.date_peremption IS NOT NULL AND i.date_peremption != '' ORDER BY i.created_at DESC LIMIT 1) as derniere_peremption
  FROM produits p
  LEFT JOIN categories c ON p.categorie_id = c.id
  LEFT JOIN fournisseurs f ON p.fournisseur_id = f.id
`;

router.get('/', async (req, res) => {
  try {
    const { categorie, search, lieu_id } = req.query;
    let query = PRODUIT_SELECT;
    const params = [];
    const conditions = ["(p.archived IS NULL OR p.archived = false)"];

    if (categorie) { conditions.push(`c.name = $${params.length + 1}`); params.push(categorie); }
    if (search) { conditions.push(`(p.denomination ILIKE $${params.length + 1} OR p.appellation_interne ILIKE $${params.length + 1})`); params.push(`%${search}%`); }
    if (lieu_id) {
      query = query.replace('FROM produits p', 'FROM produits p JOIN produit_lieu pl ON pl.produit_id = p.id AND pl.lieu_id = $' + (params.length + 1));
      params.push(lieu_id);
    }

    query += ` WHERE ${conditions.join(' AND ')}`;
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
    const fields = ['denomination','appellation_interne','taille','ref_fournisseur','conditionnement','consommation_mensuelle','prix','categorie_id','fournisseur_id','sans_peremption','peremption_sans_jour'];
    const updates = [];
    const vals = [];
    let i = 1;

    fields.forEach(f => {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = $${i++}`);
        vals.push(req.body[f] === '' ? null : req.body[f]);
      }
    });

    if (req.body.conditionnement_type !== undefined) {
      const c = normaliserConditionnement(req.body.conditionnement_type, req.body.conditionnement_quantite, req.body.conditionnement_quantite_non_precisee);
      if (c.error) return res.status(400).json({ error: c.error });
      updates.push(`conditionnement_type = $${i++}`, `conditionnement_quantite = $${i++}`, `conditionnement_quantite_non_precisee = $${i++}`);
      vals.push(c.type, c.quantite, c.nonPrecisee);
    }

    if (req.file) {
      try {
        const jpegPath = await convertToJpeg(req.file.path);
        const filename = path.basename(jpegPath);
        updates.push(`photo_url = $${i++}`);
        vals.push(`/stocks/uploads/${filename}`);
      } catch (sharpErr) {
        console.error('SHARP ERROR:', sharpErr.message, 'file:', req.file.path, 'mimetype:', req.file.mimetype, 'size:', req.file.size);
        return res.status(500).json({ error: 'Erreur conversion image: ' + sharpErr.message });
      }
    } else if (req.body.delete_photo === 'true') {
      updates.push(`photo_url = $${i++}`);
      vals.push(null);
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
    const { denomination, appellation_interne, taille, categorie_id, ref_fournisseur, fournisseur_id, conditionnement, conditionnement_type, conditionnement_quantite, conditionnement_quantite_non_precisee, consommation_mensuelle, prix, sans_peremption, peremption_sans_jour } = req.body;
    if (!denomination) return res.status(400).json({ error: 'Dénomination requise' });
    const c = normaliserConditionnement(conditionnement_type, conditionnement_quantite, conditionnement_quantite_non_precisee);
    if (c.error) return res.status(400).json({ error: c.error });
    const id = randomUUID();
    await pool.query(
      `INSERT INTO produits (id, denomination, appellation_interne, taille, categorie_id, ref_fournisseur, fournisseur_id, conditionnement, conditionnement_type, conditionnement_quantite, conditionnement_quantite_non_precisee, consommation_mensuelle, prix, sans_peremption, peremption_sans_jour)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [id, denomination, appellation_interne||null, taille||null, categorie_id||null, ref_fournisseur||null, fournisseur_id||null, conditionnement||null, c.type, c.quantite, c.nonPrecisee, consommation_mensuelle||null, prix||null, sans_peremption === 'true' || sans_peremption === true, peremption_sans_jour === 'true' || peremption_sans_jour === true]
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

