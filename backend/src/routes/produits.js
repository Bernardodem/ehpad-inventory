import { Router } from 'express';
import { randomUUID } from 'crypto';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from '../db/init.js';
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

router.get('/', (req, res) => {
  const db = getDb();
  const { categorie, search } = req.query;
  let query = PRODUIT_SELECT;
  const params = [];

  if (categorie && search) {
    query += ` WHERE c.name = ? AND p.denomination LIKE ?`;
    params.push(categorie, `%${search}%`);
  } else if (categorie) {
    query += ` WHERE c.name = ?`;
    params.push(categorie);
  } else if (search) {
    query += ` WHERE p.denomination LIKE ?`;
    params.push(`%${search}%`);
  }
  query += ` ORDER BY c.name, p.denomination`;
  res.json(db.prepare(query).all(...params));
});

router.get('/categories', (req, res) => {
  const db = getDb();
  res.json(db.prepare(`SELECT * FROM categories ORDER BY name`).all());
});

router.get('/fournisseurs', (req, res) => {
  const db = getDb();
  res.json(db.prepare(`SELECT * FROM fournisseurs ORDER BY name`).all());
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const p = db.prepare(`${PRODUIT_SELECT} WHERE p.id = ?`).get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Produit introuvable' });
  res.json(p);
});

router.patch('/:id', requireRole('gestionnaire', 'admin'), upload.single('photo'), (req, res) => {
  const db = getDb();
  const p = db.prepare(`SELECT id FROM produits WHERE id = ?`).get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Produit introuvable' });

  const fields = ['denomination','taille','ref_fournisseur','conditionnement','consommation_mensuelle','dotation','seuil_commande','prix','emplacement_etagere','emplacement_etage','categorie_id','fournisseur_id'];
  const updates = [];
  const vals = [];

  fields.forEach(f => {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      vals.push(req.body[f] === '' ? null : req.body[f]);
    }
  });

  if (req.file) {
    updates.push('photo_url = ?');
    vals.push(`/uploads/${req.file.filename}`);
  }

  if (updates.length === 0) return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });

  updates.push(`updated_at = datetime('now')`);
  vals.push(req.params.id);
  db.prepare(`UPDATE produits SET ${updates.join(', ')} WHERE id = ?`).run(...vals);
  res.json({ success: true });
});

router.post('/', requireRole('gestionnaire', 'admin'), (req, res) => {
  const db = getDb();
  const { denomination, taille, categorie_id, ref_fournisseur, fournisseur_id, conditionnement, consommation_mensuelle, dotation, seuil_commande, prix } = req.body;
  if (!denomination) return res.status(400).json({ error: 'Dénomination requise' });
  const id = randomUUID();
  db.prepare(`
    INSERT INTO produits (id, denomination, taille, categorie_id, ref_fournisseur, fournisseur_id, conditionnement, consommation_mensuelle, dotation, seuil_commande, prix)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, denomination, taille||null, categorie_id||null, ref_fournisseur||null, fournisseur_id||null, conditionnement||null, consommation_mensuelle||null, dotation||null, seuil_commande||null, prix||null);
  res.status(201).json({ id });
});

export default router;
