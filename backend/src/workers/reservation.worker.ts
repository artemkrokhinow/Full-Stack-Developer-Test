import Redis from 'ioredis';
import { Queue, Worker, ConnectionOptions } from 'bullmq';
import { logger } from '../utils/logger';
import { ProductService } from '../services/product.service';

import crypto from 'crypto';
import { loggerContext } from '../utils/logger';
import { RESERVATION_EXPIRATION_MS } from '../config/env';
import prisma from '../utils/prisma';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  lazyConnect: true
});
redis.on('error', () => {
  // Catch background reconnect attempt errors silently to prevent console pollution.
});

export let redisOnline = false;
export let reservationQueue: Queue | null = null;
export let worker: Worker | null = null;

export async function initRedisAndQueue() {
  try {
    await redis.connect();
    redisOnline = true;
    logger.info('Connected to Redis. High-concurrency BullMQ worker activated.');

    // We pass `redis` to BullMQ. Strict type casting avoids 'any'
    reservationQueue = new Queue('reservations', { connection: redis as unknown as ConnectionOptions });

    // Enqueue distributed cron job (runs every minute)
    await reservationQueue.add(
      'release_expired_reservations',
      {},
      { repeat: { pattern: '* * * * *' }, jobId: 'cron_release_expired' }
    );

    worker = new Worker('reservations', async (job) => {
      const correlationId = job.data?.correlationId || crypto.randomUUID();
      
      return loggerContext.run({ correlationId, channelId: 'bullmq-worker' }, async () => {
        if (job.name === 'release_expired_reservations') {
          const released = await ProductService.releaseExpiredReservations();
          if (released.length > 0) {
            logger.info(`[BullMQ Cron] Released ${released.length} expired reservations.`);
          }
          return released;
        }

        const { userId, productId, quantity } = job.data;

        await prisma.$transaction(async (tx) => {
          const productUpdate = await tx.product.updateMany({
            where: {
              id: productId,
              stock: { gte: quantity }
            },
            data: {
              stock: { decrement: quantity }
            }
          });

          if (productUpdate.count === 0) {
            throw new Error('Race condition: Stock was depleted during execution');
          }

          await tx.reservation.create({
            data: {
              id: job.id!, 
              userId,
              productId,
              quantity,
              status: 'PENDING',
              expiresAt: new Date(Date.now() + RESERVATION_EXPIRATION_MS)
            }
          });

          await tx.inventoryLog.create({
            data: {
              productId,
              change: -quantity,
              reason: 'RESERVATION_RESERVED'
            }
          });
        });
      });
    }, {
      connection: redis as unknown as ConnectionOptions,
      concurrency: 50
    });

    worker.on('error', (err: Error) => {
      logger.error('BullMQ Worker general error:', err);
    });

    worker.on('failed', (job, err: Error) => {
      logger.error(`BullMQ Job ${job?.id} failed: ${err.message}`, err);
    });

    // Synchronize DB stocks to Redis cache on startup
    const dbProducts = await prisma.product.findMany();
    for (const p of dbProducts) {
      await redis.set(`product:${p.id}:stock`, p.stock);
    }
    logger.info('Redis stocks synchronized with database values.');

  } catch (err: unknown) {
    redisOnline = false;
    reservationQueue = null;
    worker = null;
    logger.warn('Could not connect to Redis. Running in database-only fallback mode.');
  }
}
