import { logger } from '../utils/logger';
import { ProductService } from '../services/product.service';

export function startInternalScheduler() {
  logger.info('Starting internal scheduler for expiration tasks...');
  let isRunning = false;

  const poll = async () => {
    if (isRunning) return;
    isRunning = true;

    try {
      await ProductService.releaseExpiredReservations();
    } catch (error) {
      logger.error('Error in internal expiration cron job', { error });
    } finally {
      isRunning = false;
      // Рекурсивный планировщик: следующий тик ТОЛЬКО после завершения запроса к БД
      setTimeout(poll, 10000); 
    }
  };

  poll();
}
