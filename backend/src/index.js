import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb } from './db/init.js';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import produitsRoutes from './routes/produits.js';
import inventaireRoutes from './routes/inventaire.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/produits', produitsRoutes);
app.use('/api/inventaire', inventaireRoutes);

app.get('/api/health', (_, res) => res.json({ status: 'ok', service: 'EHPAD Arc en Ciel - Inventaire' }));

initDb().then(() => {
  app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));
}).catch(err => {
  console.error('Erreur init DB:', err);
  process.exit(1);
});