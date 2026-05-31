import 'dotenv/config';
import app from './app';
import { startInternalScheduler } from './workers/scheduler';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 3000;

async function startServer() {
  // Инициализация симуляции cron в рамках одного процесса (согласно ТЗ для Render)
  startInternalScheduler();

  const server = app.listen(PORT, () => {
    logger.info(`Backend server is running on http://localhost:${PORT}`);
  });

  process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    server.close(() => process.exit(0));
  });
}

startServer();
