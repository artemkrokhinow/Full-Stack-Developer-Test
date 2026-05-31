import { CheckoutService } from '../src/services/checkout.service';
import prisma from '../src/utils/prisma';
import { DomainError, OutOfStockException, InvalidReservationError } from '../src/utils/errors';

// Mock dependencies
jest.mock('../src/utils/prisma', () => ({
  __esModule: true,
  default: {
    reservation: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    inventoryLog: {
      create: jest.fn(),
    },
    product: {
      updateMany: jest.fn(),
    },
    order: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(prisma)),
  },
}));

describe('CheckoutService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('reserve', () => {
    it('throws OutOfStockException if no stock is updated', async () => {
      (prisma.product.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      await expect(
        CheckoutService.reserve('user-1', 'prod-1', 1)
      ).rejects.toThrow(OutOfStockException);
    });
  });

  describe('confirmCheckout', () => {
    it('throws InvalidReservationError if P2025 is returned and no existing order', async () => {
      (prisma.reservation.update as jest.Mock).mockRejectedValue({ code: 'P2025' });
      (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        CheckoutService.confirmCheckout('res-1')
      ).rejects.toThrow(InvalidReservationError);
    });
  });
});
