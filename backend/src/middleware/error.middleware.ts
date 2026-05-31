import { Request, Response, NextFunction } from 'express';
import { DomainError } from '../utils/errors';
import { logger } from '../utils/logger';
import { ZodError } from 'zod';

export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction) {
  // 1. Domain errors → mapped HTTP status
  if (error instanceof DomainError) {
    logger.warn(`Domain Error: ${error.message}`, { path: req.path, statusCode: error.statusCode });
    return res.status(error.statusCode).json({ error: error.message });
  }

  // 2. Zod validation errors → 400
  if (error instanceof ZodError) {
    logger.warn('Validation Error', { path: req.path, issues: error.issues });
    return res.status(400).json({ error: 'Validation failed', details: error.issues });
  }

  // 3. Unknown errors → 500 (server stays alive!)
  const message = error instanceof Error ? error.message : 'Internal Server Error';
  logger.error('Unhandled Server Error', error instanceof Error ? error : new Error(String(error)));
  res.status(500).json({ error: 'Internal Server Error' });
}
