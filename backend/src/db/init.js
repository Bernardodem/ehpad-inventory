import pg from 'pg';
import { randomUUID } from 'crypto';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export function getDb() {
  return pool;
}

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('inventaire', 'gestionnaire', 'admin')),
      created_at TIMESTAMP DEFAULT NOW(),
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS fournisseurs (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS lieux_stockage (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      ordre INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS produits (
      id TEXT PRIMARY KEY,
      denomination TEXT NOT NULL,
      taille TEXT,
      categorie_id TEXT REFERENCES categories(id),
      ref_fournisseur TEXT,
      fournisseur_id TEXT REFERENCES fournisseurs(id),
      conditionnement TEXT,
      consommation_mensuelle REAL,
      prix REAL,
      photo_url TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      archived BOOLEAN DEFAULT false,
      sans_peremption BOOLEAN DEFAULT false,
      peremption_sans_jour BOOLEAN DEFAULT false
    );

    -- Dotation, seuil et emplacement sont propres a chaque lieu de stockage
    CREATE TABLE IF NOT EXISTS produit_lieu (
      id TEXT PRIMARY KEY,
      produit_id TEXT NOT NULL REFERENCES produits(id) ON DELETE CASCADE,
      lieu_id TEXT NOT NULL REFERENCES lieux_stockage(id) ON DELETE CASCADE,
      dotation REAL,
      seuil_commande REAL,
      emplacement_etagere TEXT,
      emplacement_etage TEXT,
      emplacement TEXT,
      UNIQUE (produit_id, lieu_id)
    );

    CREATE TABLE IF NOT EXISTS etageres (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      ordre INTEGER DEFAULT 0,
      lieu_id TEXT REFERENCES lieux_stockage(id) ON DELETE CASCADE,
      CONSTRAINT etageres_lieu_name_unique UNIQUE (lieu_id, name)
    );

    CREATE TABLE IF NOT EXISTS niveaux (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      ordre INTEGER DEFAULT 0,
      lieu_id TEXT REFERENCES lieux_stockage(id) ON DELETE CASCADE,
      CONSTRAINT niveaux_lieu_name_unique UNIQUE (lieu_id, name)
    );

    CREATE TABLE IF NOT EXISTS emplacements (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      ordre INTEGER DEFAULT 0,
      lieu_id TEXT REFERENCES lieux_stockage(id) ON DELETE CASCADE,
      CONSTRAINT emplacements_lieu_name_unique UNIQUE (lieu_id, name)
    );

    CREATE TABLE IF NOT EXISTS inventaire_sessions (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('total','partiel')),
      categories TEXT,
      status TEXT DEFAULT 'en_cours' CHECK(status IN ('en_cours','termine')),
      created_by TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      finished_at TIMESTAMP,
      lieu_id TEXT REFERENCES lieux_stockage(id)
    );

    CREATE TABLE IF NOT EXISTS inventaires (
      id TEXT PRIMARY KEY,
      produit_id TEXT NOT NULL REFERENCES produits(id),
      quantite REAL NOT NULL,
      date_peremption TEXT,
      inventaire_session_id TEXT NOT NULL,
      created_by TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS commandes (
      id TEXT PRIMARY KEY,
      fournisseur_id TEXT NOT NULL REFERENCES fournisseurs(id),
      inventaire_session_id TEXT REFERENCES inventaire_sessions(id),
      status TEXT DEFAULT 'validee' NOT NULL CHECK(status IN ('validee','recue_partielle','recue')),
      date_validation TIMESTAMP DEFAULT NOW(),
      date_reception TIMESTAMP,
      created_by TEXT
    );

    CREATE TABLE IF NOT EXISTS commande_lignes (
      id TEXT PRIMARY KEY,
      commande_id TEXT NOT NULL REFERENCES commandes(id) ON DELETE CASCADE,
      produit_id TEXT NOT NULL REFERENCES produits(id),
      quantite_commandee REAL NOT NULL,
      quantite_recue REAL
    );

    CREATE TABLE IF NOT EXISTS commande_receptions (
      id TEXT PRIMARY KEY,
      commande_ligne_id TEXT NOT NULL REFERENCES commande_lignes(id) ON DELETE CASCADE,
      quantite REAL NOT NULL,
      date_reception TIMESTAMP DEFAULT NOW()
    );
  `);

  // Seed categories
  const cats = ['Alimentation','Diabétologie','Divers','EPI','Examen','Hygiène','Médicament','Ophtalmologie','Pansement','Protection','Soins','Urologie'];
  for (const c of cats) {
    await pool.query(`INSERT INTO categories (id, name) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING`, [randomUUID(), c]);
  }

  // Seed fournisseurs
  const fours = ['CS Médical','Alpha diab','Blédina France','Pharmacie du bon temps'];
  for (const f of fours) {
    await pool.query(`INSERT INTO fournisseurs (id, name) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING`, [randomUUID(), f]);
  }

  // Seed lieu de stockage par defaut
  const lieuxCount = await pool.query(`SELECT COUNT(*) as c FROM lieux_stockage`);
  if (parseInt(lieuxCount.rows[0].c) === 0) {
    await pool.query(`INSERT INTO lieux_stockage (id, name, ordre) VALUES ($1, $2, 0)`, [randomUUID(), 'Stock médical']);
  }

  // Seed produits
  const countRes = await pool.query(`SELECT COUNT(*) as c FROM produits`);
  if (parseInt(countRes.rows[0].c) === 0) {
    const getCat = async name => (await pool.query(`SELECT id FROM categories WHERE name = $1`, [name])).rows[0]?.id;
    const getFour = async name => (await pool.query(`SELECT id FROM fournisseurs WHERE name = $1`, [name])).rows[0]?.id;
    const lieuId = (await pool.query(`SELECT id FROM lieux_stockage ORDER BY ordre, created_at LIMIT 1`)).rows[0]?.id;

    const produits = [
      ['Blédine', '400g', 'Alimentation', null, 'Blédina France', 'Unité', 15, 20, null],
      ['Gelodiet poudre epaississante', '225g', 'Alimentation', '484', 'CS Médical', 'cartons de 12 bte', 1, 2, '1'],
      ['Aiguilles sécurisées pour stylo insuline', null, 'Diabétologie', null, 'Alpha diab', 'Boîte de 100', 400, 500, '100'],
      ['Auto piqueurs usage unique', null, 'Diabétologie', null, 'Alpha diab', 'Boîte de 200', 400, 500, '100'],
      ['Bandelette test glycémie fora comfort', null, 'Diabétologie', null, 'CS Médical', 'Boîte de 100', 400, 500, '100'],
      ['Lecteur glycémie fora comfort plus', null, 'Diabétologie', null, 'CS Médical', 'unité', null, null, null],
      ['Brumisateur eau minérale', '400mL', 'Divers', '47797', 'CS Médical', 'Boite de 9', null, 3, '1'],
      ['Gants nitrile', 'S', 'EPI', '73374', 'CS Médical', 'Boite de 100', 5, 10, '5'],
      ['Gants nitrile', 'M', 'EPI', '73350', 'CS Médical', 'Boite de 100', 20, 30, '10'],
      ['Gants nitrile', 'L', 'EPI', '73375', 'CS Médical', 'Boite de 100', 40, 50, '10'],
      ['Gants nitrile', 'XL', 'EPI', '73431', 'CS Médical', 'Boite de 100', 20, 30, '10'],
      ['Gants stériles non poudrés', '7.5', 'EPI', '57544', 'CS Médical', 'Boite de 50', null, 1, '0,5 boite'],
      ['Masque chirurgicaux bleus', null, 'EPI', '62235', 'CS Médical', 'Boite de 50', null, 10, '5'],
      ['Masque FFP 2', null, 'EPI', '82379', 'CS Médical', 'boite de 50', null, 10, '5'],
      ['Pyjama bleu', 'L', 'EPI', '57469', 'CS Médical', 'Unité', null, 50, '10'],
      ['Pyjama bleu', 'XL', 'EPI', '57470', 'CS Médical', 'unité', null, 50, '10'],
      ['Tablier de protection', null, 'EPI', '44789', 'CS Médical', 'Sachet de 100', 3000, 4000, '750'],
      ['Abaisse langue', null, 'Examen', '82075', 'CS Médical', 'Boîte de 100', null, 1, '0.5'],
      ['Garrot vert sans latex', null, 'Examen', '70551', 'CS Médical', 'Boîte de 25', null, 1, '0.5'],
      ['Protection thermomètre auriculaire', null, 'Examen', '588', 'CS Médical', 'carton de 800', null, 2, '1'],
      ['Aniosgel 100mL', null, 'Hygiène', '54525', 'CS Médical', 'unité', 20, 30, '10'],
      ['Aniosgel 1L (mural)', null, 'Hygiène', '1644333', 'CS Médical', 'unité', 15, 15, '5'],
      ['Aniosgel 1L (pompe)', null, 'Hygiène', '2550763', 'CS Médical', 'unité', 10, 10, '5'],
      ['Batonnets citronnés', null, 'Hygiène', '349', 'CS Médical', '25 sachets de 3', 25, 50, '20'],
      ['Bicarbonate de sodium Dentidose 75g', null, 'Hygiène', '53671', 'CS Médical', 'unité', null, 5, '2'],
      ['Carrés de soin', null, 'Hygiène', '86320', 'CS Médical', '12 sachets de 40', 5, 5, '2'],
      ['Crème dermoprotectrice Menalind Zinc 200mL', null, 'Hygiène', '46176', 'CS Médical', 'unité', 10, 10, '2'],
      ['Cuvette haricot fibre', null, 'Hygiène', '330', 'CS Médical', 'Carton de 320', null, 1, '0.5'],
      ['Gants de toilette UU', null, 'Hygiène', '76387', 'CS Médical', 'Sachet de 50', 6, 6, '2'],
      ['Huile protectrice 200mL', null, 'Hygiène', '56020', 'CS Médical', 'unité', 10, 10, '5'],
      ['Savon liquide Anios 500mL', null, 'Hygiène', '54312', 'CS Médical', 'unité', 15, 20, '5'],
      ['Serviettes de toilette jetables', null, 'Hygiène', '76410', 'CS Médical', 'Paquet de 50', 10, 10, '3'],
      ['Compresses non stériles 7.5x7.5', null, 'Pansement', '55001', 'CS Médical', 'Sachet de 100', 50, 100, '30'],
      ['Compresses stériles 7.5x7.5', null, 'Pansement', '55002', 'CS Médical', 'Boîte de 50', 30, 50, '20'],
      ['Bandes de gaze 5cmx4m', null, 'Pansement', '60100', 'CS Médical', 'Sachet de 10', 20, 30, '10'],
      ['Sparadrap microporeux 5cmx10m', null, 'Pansement', '61200', 'CS Médical', 'Rouleau', 10, 15, '5'],
      ['Sac linge sale 50L', null, 'Protection', '44100', 'CS Médical', 'Rouleau de 50', 100, 200, '50'],
      ['Protection anatomique maxi', null, 'Protection', '70200', 'CS Médical', 'Paquet de 30', 200, 400, '100'],
      ['Alèse jetable 60x90', null, 'Protection', '71000', 'CS Médical', 'Paquet de 30', 100, 150, '50'],
      ['Slip filet', 'T3', 'Protection', '72100', 'CS Médical', 'Sachet de 5', 50, 100, '20'],
    ];

    for (const [denom, taille, cat, ref, four, cond, conso, dotation, seuil] of produits) {
      const catId = await getCat(cat);
      const fourId = await getFour(four);
      const produitId = randomUUID();
      await pool.query(
        `INSERT INTO produits (id, denomination, taille, categorie_id, ref_fournisseur, fournisseur_id, conditionnement, consommation_mensuelle)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [produitId, denom, taille||null, catId||null, ref||null, fourId||null, cond||null, conso||null]
      );
      // Dotation et seuil rattaches au lieu par defaut ('0,5 boite' -> 0.5)
      const seuilNum = seuil ? parseFloat(seuil.replace(',', '.')) : null;
      await pool.query(
        `INSERT INTO produit_lieu (id, produit_id, lieu_id, dotation, seuil_commande) VALUES ($1,$2,$3,$4,$5)`,
        [randomUUID(), produitId, lieuId, dotation ?? null, Number.isNaN(seuilNum) ? null : seuilNum]
      );
    }
  }

  console.log('Base de données PostgreSQL initialisée');
}
