import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = '/tmp/ehpad.db';

let db;

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export function initDb() {
  const database = new Database(DB_PATH);
  database.pragma('journal_mode = WAL');
  database.pragma('foreign_keys = ON');
  db = database;

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('inventaire', 'gestionnaire', 'admin')),
      created_at TEXT DEFAULT (datetime('now')),
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

    CREATE TABLE IF NOT EXISTS produits (
      id TEXT PRIMARY KEY,
      denomination TEXT NOT NULL,
      taille TEXT,
      categorie_id TEXT REFERENCES categories(id),
      ref_fournisseur TEXT,
      fournisseur_id TEXT REFERENCES fournisseurs(id),
      conditionnement TEXT,
      consommation_mensuelle REAL,
      dotation REAL,
      seuil_commande TEXT,
      prix REAL,
      emplacement_etagere TEXT CHECK(emplacement_etagere IN ('A','B','C') OR emplacement_etagere IS NULL),
      emplacement_etage INTEGER,
      photo_url TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS inventaires (
      id TEXT PRIMARY KEY,
      produit_id TEXT NOT NULL REFERENCES produits(id),
      quantite REAL NOT NULL,
      date_peremption TEXT,
      inventaire_session_id TEXT NOT NULL,
      created_by TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS inventaire_sessions (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('total','partiel')),
      categories TEXT,
      status TEXT DEFAULT 'en_cours' CHECK(status IN ('en_cours','termine')),
      created_by TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      finished_at TEXT
    );
  `);

  const cats = ['Alimentation','Diabétologie','Divers','EPI','Examen','Hygiène','Médicament','Ophtalmologie','Pansement','Protection','Soins','Urologie'];
  const insertCat = db.prepare(`INSERT OR IGNORE INTO categories (id, name) VALUES (?, ?)`);
  cats.forEach(c => insertCat.run(randomUUID(), c));

  const fours = ['CS Médical','Alpha diab','Blédina France','Pharmacie du bon temps'];
  const insertFour = db.prepare(`INSERT OR IGNORE INTO fournisseurs (id, name) VALUES (?, ?)`);
  fours.forEach(f => insertFour.run(randomUUID(), f));

  const existingAdmin = db.prepare(`SELECT id FROM users WHERE username = 'admin'`).get();
  if (!existingAdmin) {
    const hash = bcrypt.hashSync('Admin2024!', 10);
    db.prepare(`INSERT INTO users (id, username, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)`).run(
      randomUUID(), 'admin', hash, 'Administrateur', 'admin'
    );
    db.prepare(`INSERT INTO users (id, username, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)`).run(
      randomUUID(), 'idec', hash, 'IDEC Arc en Ciel', 'gestionnaire'
    );
    const hashInv = bcrypt.hashSync('Inv2024!', 10);
    db.prepare(`INSERT INTO users (id, username, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)`).run(
      randomUUID(), 'inventaire1', hashInv, 'Agent Inventaire', 'inventaire'
    );
  }

  const getCat = db.prepare(`SELECT id FROM categories WHERE name = ?`);
  const getFour = db.prepare(`SELECT id FROM fournisseurs WHERE name = ?`);
  const countProduits = db.prepare(`SELECT COUNT(*) as c FROM produits`).get();

  if (countProduits.c === 0) {
    const insertProduit = db.prepare(`
      INSERT INTO produits (id, denomination, taille, categorie_id, ref_fournisseur, fournisseur_id, conditionnement, consommation_mensuelle, dotation, seuil_commande)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

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

    produits.forEach(([denom, taille, cat, ref, four, cond, conso, dotation, seuil]) => {
      const catRow = getCat.get(cat);
      const fourRow = getFour.get(four);
      insertProduit.run(
        randomUUID(), denom, taille,
        catRow?.id || null,
        ref,
        fourRow?.id || null,
        cond, conso, dotation, seuil
      );
    });
  }

  console.log('Base de données initialisée');
  return db;
}