import 'dotenv/config';
console.log("=== SERVER PROCESS STARTING ===");
import app from './app';
import { startInternalScheduler } from './workers/scheduler';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 3000;

async function startServer() {
  // Инициализация симуляции cron в рамках одного процесса (согласно ТЗ для Render)
  startInternalScheduler();

  const server = app.listen(Number(PORT), '0.0.0.0', () => {
    logger.info(`Backend server is running on http://0.0.0.0:${PORT}`);
  });

  process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    server.close(() => process.exit(0));
  });
}

startServer();
