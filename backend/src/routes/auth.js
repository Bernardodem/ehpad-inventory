import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/me', authMiddleware, (req, res) => {
  res.json(req.user);
});

export default router;