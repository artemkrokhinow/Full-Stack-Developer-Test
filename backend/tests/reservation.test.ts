import { CheckoutService } from '../src/services/checkout.service';
import prisma from '../src/utils/prisma';

/**
 * Reservation Logic Tests (Unit)
 * 
 * These tests validate the core reservation logic:
 * - Atomic stock decrement via Prisma transaction
 * - Idempotency key deduplication
 * - Race condition handling (P2025 = out of stock)
 */

jest.mock('../src/utils/prisma', () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn(),
    reservation: { findUniqueOrThrow: jest.fn(), findUnique: jest.fn() },
    order: { findUnique: jest.fn() },
    product: { findUnique: jest.fn() },
  },
}));

describe('Reservation Logic', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('Atomic Reserve (race condition prevention)', () => {
    it('should successfully reserve when stock is available', async () => {
      const mockReservation = {
        id: 'res-123',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (cb: (tx: any) => Promise<any>) => {
        const tx = {
          product: {
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
          reservation: {
            create: jest.fn().mockResolvedValue(mockReservation),
          },
          inventoryLog: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return cb(tx);
      });

      const result = await CheckoutService.reserve('user-1', 'prod-1', 1);
      expect(result.id).toBe('res-123');
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should reject with OutOfStockException when concurrent user took the last item', async () => {
      // Simulates: updateMany returns count: 0 because another transaction already took the stock
      (prisma.$transaction as jest.Mock).mockImplementation(async (cb: (tx: any) => Promise<any>) => {
        const tx = {
          product: {
            updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          },
        };
        return cb(tx);
      });

      // The service throws P2025 internally when count === 0
      (prisma.$transaction as jest.Mock).mockRejectedValue(
        Object.assign(new Error('Record to update not found.'), { code: 'P2025' })
      );

      await expect(
        CheckoutService.reserve('user-2', 'prod-1', 1)
      ).rejects.toThrow('Not enough stock or product not found');
    });

    it('should handle idempotent duplicate request gracefully', async () => {
      const existingReservation = {
        id: 'res-existing',
        expiresAt: new Date(Date.now() + 4 * 60 * 1000),
        idempotencyKey: 'idem-key-1',
      };

      // Simulate unique constraint violation on idempotencyKey
      (prisma.$transaction as jest.Mock).mockRejectedValue(
        Object.assign(new Error('Unique constraint'), {
          code: 'P2002',
          meta: { target: ['idempotencyKey'] },
        })
      );
      (prisma.reservation.findUniqueOrThrow as jest.Mock).mockResolvedValue(existingReservation);

      const result = await CheckoutService.reserve('user-1', 'prod-1', 1, 'idem-key-1');
      expect(result.id).toBe('res-existing');
    });
  });

  describe('Confirm Checkout', () => {
    it('should complete checkout successfully', async () => {
      (prisma.$transaction as jest.Mock).mockImplementation(async (cb: (tx: any) => Promise<any>) => {
        const tx = {
          reservation: {
            update: jest.fn().mockResolvedValue({
              id: 'res-1',
              userId: 'user-1',
              productId: 'prod-1',
              quantity: 1,
              product: { price: 9999 },
            }),
          },
          order: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return cb(tx);
      });

      const result = await CheckoutService.confirmCheckout('res-1');
      expect(result).toBe(true);
    });

    it('should return true for already-completed checkout (idempotent)', async () => {
      (prisma.$transaction as jest.Mock).mockRejectedValue(
        Object.assign(new Error('Not found'), { code: 'P2025' })
      );
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({ id: 'order-1' });

      const result = await CheckoutService.confirmCheckout('res-1');
      expect(result).toBe(true);
    });
  });
});
