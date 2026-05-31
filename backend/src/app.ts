import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { logger } from './utils/logger';
import { observabilityMiddleware } from './middleware/observability';
import { getMetrics } from './middleware/observability';
import { authRouter } from './routes/auth.routes';
import { productRouter } from './routes/product.routes';
import { checkoutRouter } from './routes/checkout.routes';
import { errorHandler } from './middleware/error.middleware';
import { authenticateToken } from './utils/auth';
import prisma from './utils/prisma';

const app = express();

// Add observability FIRST so correlationId is captured immediately
app.use(observabilityMiddleware);

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

// Global rate limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' }
});
app.use(globalLimiter);

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// Metrics endpoint
app.get('/api/metrics', (_req: Request, res: Response) => {
  res.json(getMetrics());
});

// Auth rate limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts' }
});

import { dropRateLimiter } from './middleware/rateLimiter';

// API Routes
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/products', productRouter);
app.use('/api/checkout', authenticateToken, dropRateLimiter, checkoutRouter);

// Admin details/inventory logging audit endpoint
app.get('/api/admin/inventory-logs', 
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const logs = await prisma.inventoryLog.findMany({
        include: { product: { select: { name: true } } },
        orderBy: { createdAt: 'desc' }
      });
      res.json(logs);
    } catch (error) {
      next(error);
    }
  }
);

import path from 'path';

// Global Error Handling Middleware
app.use(errorHandler);

// Serve frontend static files in production
app.use(express.static(path.join(__dirname, '../../frontend/dist')));
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
});

export default app;
