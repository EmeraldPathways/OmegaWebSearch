import { Request, Response, NextFunction } from 'express';
import { SearchRequestSchema, AppError } from '../types';
import { runActorSearch } from '../services/apify-client';

export async function searchHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = SearchRequestSchema.safeParse(req.query);
    if (!parsed.success) {
      const message = parsed.error.errors.map(e => e.message).join(', ');
      throw new AppError('INVALID_PARAMS', message, 400);
    }

    const result = await runActorSearch(parsed.data);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}
