import { CheckoutService } from '../src/services/checkout.service';
import prisma from '../src/utils/prisma';

// Mock Prisma
jest.mock('../src/utils/prisma', () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn(),
    reservation: { findUniqueOrThrow: jest.fn(), findUnique: jest.fn() },
    order: { findUnique: jest.fn() },
  },
}));

describe('CheckoutService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('reserve', () => {
    it('should throw OutOfStockException when stock is insufficient', async () => {
      (prisma.$transaction as jest.Mock).mockRejectedValue(
        Object.assign(new Error('Record to update not found.'), { code: 'P2025' })
      );

      await expect(
        CheckoutService.reserve('user-1', 'product-1', 1)
      ).rejects.toThrow('Not enough stock or product not found');
    });

    it('should return existing reservation on duplicate idempotencyKey', async () => {
      const existing = { id: 'res-1', expiresAt: new Date() };
      (prisma.$transaction as jest.Mock).mockRejectedValue(
        Object.assign(new Error('Unique constraint'), { code: 'P2002', meta: { target: ['idempotencyKey'] } })
      );
      (prisma.reservation.findUniqueOrThrow as jest.Mock).mockResolvedValue(existing);

      const result = await CheckoutService.reserve('user-1', 'product-1', 1, 'dup-key');
      expect(result.id).toBe('res-1');
    });
  });

  describe('confirmCheckout', () => {
    it('should return true if order already exists (idempotent)', async () => {
      (prisma.$transaction as jest.Mock).mockRejectedValue(
        Object.assign(new Error('Not found'), { code: 'P2025' })
      );
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({ id: 'order-1' });

      const result = await CheckoutService.confirmCheckout('res-1');
      expect(result).toBe(true);
    });

    it('should throw InvalidReservationError when reservation not found and no order', async () => {
      (prisma.$transaction as jest.Mock).mockRejectedValue(
        Object.assign(new Error('Not found'), { code: 'P2025' })
      );
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        CheckoutService.confirmCheckout('res-nonexistent')
      ).rejects.toThrow('Reservation already completed, expired or not found');
    });
  });

  describe('getReservationStatus', () => {
    it('should return completed status for existing reservation', async () => {
      const mockReservation = { id: 'res-1', status: 'PENDING' };
      (prisma.reservation.findUnique as jest.Mock).mockResolvedValue(mockReservation);

      const result = await CheckoutService.getReservationStatus('res-1');
      expect(result.status).toBe('completed');
      expect(result.reservation).toEqual(mockReservation);
    });

    it('should throw ResourceNotFoundException for missing reservation', async () => {
      (prisma.reservation.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        CheckoutService.getReservationStatus('nonexistent')
      ).rejects.toThrow('Reservation not found');
    });
  });
});
