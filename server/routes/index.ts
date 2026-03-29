import { Router, Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { AppError } from '../types';
import { searchHandler } from './search';

const router = Router();

function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (token !== config.apiSecretKey) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or missing API key' } });
    return;
  }
  next();
}

router.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

router.use('/v1', authMiddleware);
router.get('/v1/search', searchHandler);

export default router;
