import 'dotenv/config';
import app from './app';
import { initRedisAndQueue } from './workers/reservation.worker';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 3000;

// Fail-fast process handlers
process.on('uncaughtException', (err: Error) => {
  logger.error('CRITICAL: Uncaught Exception! Shutting down immediately...', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('CRITICAL: Unhandled Promise Rejection! Shutting down immediately...', reason);
  process.exit(1);
});

async function startServer() {
  // Initialize Redis stock sync and BullMQ Queue on start
  await initRedisAndQueue();

  const server = app.listen(PORT, () => {
    logger.info(`Backend server is running on http://localhost:${PORT}`);
  });

  // Clean shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
      logger.info('Server terminated');
      process.exit(0);
    });
  });
}

startServer().catch((err: unknown) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});
