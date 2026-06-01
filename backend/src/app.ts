import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { logger } from './utils/logger';
import { observabilityMiddleware, getMetrics } from './middleware/observability';
import { authRouter } from './routes/auth.routes';
import { productRouter } from './routes/product.routes';
import { checkoutRouter } from './routes/checkout.routes';
import { errorHandler } from './middleware/error.middleware';
import { authenticateToken } from './utils/auth';
import { dropRateLimiter } from './middleware/rateLimiter';
import prisma from './utils/prisma';

const app = express();

// Observability FIRST so correlationId is captured immediately
app.use(observabilityMiddleware);

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

// Global rate limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,
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
  max: 10000,
  message: { error: 'Too many auth attempts' }
});

// API Routes
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/products', productRouter);
app.use('/api/checkout', authenticateToken, dropRateLimiter, checkoutRouter);

// Admin inventory audit endpoint
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

// Global Error Handling Middleware (must be AFTER API routes, BEFORE static files)
app.use(errorHandler);

const frontendPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendPath));

app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

export default app;
