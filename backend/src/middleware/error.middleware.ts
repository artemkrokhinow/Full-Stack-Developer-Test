import { Request, Response, NextFunction } from 'express';
import { DomainError } from '../utils/errors';
import { logger } from '../utils/logger';
import { ZodError } from 'zod';

function isOperationalError(error: unknown): boolean {
  if (error instanceof DomainError) return true;
  if (error instanceof ZodError) return true;
  return false;
}

export function errorHandler(error: unknown, req: Request, res: Response, next: NextFunction) {
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

  // 3. Unknown/programmer errors → 500 + fail-fast
  const message = error instanceof Error ? error.message : 'Internal Server Error';
  logger.error('Unhandled Server Error', error instanceof Error ? error : new Error(String(error)));
  res.status(500).json({ error: 'Internal Server Error' });

  // Fail-fast: kill process for programmer errors
  logger.fatal('Programmer error detected, initiating fail-fast shutdown...');
  process.exit(1);
}
