import request from 'supertest';
import app from '../src/app';
import prisma from '../src/utils/prisma';
import { redis, redisOnline, initRedisAndQueue } from '../src/workers/reservation.worker';
import crypto from 'crypto';

beforeAll(async () => {
  await initRedisAndQueue();
  
  // Clear tables for test
  await prisma.inventoryLog.deleteMany();
  await prisma.order.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
  if (redisOnline) {
    redis.disconnect();
  }
});

describe('Reservation System Integration Tests', () => {
  let testUserId: string;
  let testProductId: string;

  beforeEach(async () => {
    // Clean tables before each test
    await prisma.inventoryLog.deleteMany();
    await prisma.order.deleteMany();
    await prisma.reservation.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();

    const user = await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        passwordHash: 'password123'
      }
    });
    testUserId = user.id;
  });

  it('Lost Updates / Concurrency Simulation: 100 parallel requests for 10 items', async () => {
    const INITIAL_STOCK = 10;
    
    const product = await prisma.product.create({
      data: {
        name: 'Limited Sneakers',
        stock: INITIAL_STOCK,
        price: 200
      }
    });
    testProductId = product.id;

    if (redisOnline) {
      await redis.set(`product:${testProductId}:stock`, INITIAL_STOCK);
    }

    // Fire 100 requests in parallel
    const NUM_REQUESTS = 100;
    const requests = Array.from({ length: NUM_REQUESTS }).map(() => {
      return request(app)
        .post('/api/checkout/reserve')
        .send({
          userId: testUserId,
          productId: testProductId,
          quantity: 1,
          idempotencyKey: crypto.randomUUID()
        });
    });

    const responses = await Promise.all(requests);

    // Count successful vs failed
    const successful = responses.filter(r => r.status === 202);
    const failed = responses.filter(r => r.status === 409 || r.status === 400);

    // Assert that exactly INITIAL_STOCK succeeded
    expect(successful.length).toBe(INITIAL_STOCK);
    expect(failed.length).toBe(NUM_REQUESTS - INITIAL_STOCK);

    // Assert DB stock is 0 and not negative
    const updatedProduct = await prisma.product.findUnique({ where: { id: testProductId } });
    expect(updatedProduct?.stock).toBe(0);

    if (redisOnline) {
      const redisStock = await redis.get(`product:${testProductId}:stock`);
      expect(Number(redisStock)).toBe(0);
    }
  });

  it('Idempotency: Sending 2 identical requests creates only 1 reservation', async () => {
    const INITIAL_STOCK = 5;
    
    const product = await prisma.product.create({
      data: {
        name: 'Idempotency Test Item',
        stock: INITIAL_STOCK,
        price: 100
      }
    });
    testProductId = product.id;

    if (redisOnline) {
      await redis.set(`product:${testProductId}:stock`, INITIAL_STOCK);
    }

    const idempotencyKey = crypto.randomUUID();

    // Fire 2 identical requests in parallel with the SAME idempotency key
    const req1 = request(app)
      .post('/api/checkout/reserve')
      .send({
        userId: testUserId,
        productId: testProductId,
        quantity: 1,
        idempotencyKey
      });

    const req2 = request(app)
      .post('/api/checkout/reserve')
      .send({
        userId: testUserId,
        productId: testProductId,
        quantity: 1,
        idempotencyKey
      });

    const [res1, res2] = await Promise.all([req1, req2]);

    expect(res1.status).toBe(202);
    expect(res2.status).toBe(202);
    // Both responses should return the same reservation ID
    expect(res1.body.reservations[0].id).toBe(res2.body.reservations[0].id);

    // Check stock was decremented exactly ONCE
    if (redisOnline) {
      const redisStock = await redis.get(`product:${testProductId}:stock`);
      expect(Number(redisStock)).toBe(INITIAL_STOCK - 1);
    }
  });
});

