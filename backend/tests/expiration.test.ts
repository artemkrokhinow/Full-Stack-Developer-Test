import { ProductService } from '../src/services/product.service';
import prisma from '../src/utils/prisma';
import { logger } from '../src/utils/logger';

// Mock dependencies
jest.mock('../src/utils/prisma', () => ({
  __esModule: true,
  default: {
    reservation: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    product: {
      update: jest.fn(),
    },
    inventoryLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(prisma)),
  },
}));

jest.mock('../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Expiration Logic (ProductService.releaseExpiredReservations)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('does nothing if no expired reservations are found', async () => {
    (prisma.reservation.findMany as jest.Mock).mockResolvedValue([]);

    const released = await ProductService.releaseExpiredReservations();

    expect(released).toEqual([]);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('releases expired reservations and restores stock', async () => {
    const expiredReservations = [
      { id: 'res-1', productId: 'prod-1', quantity: 1, expiresAt: new Date(Date.now() - 1000) },
      { id: 'res-2', productId: 'prod-2', quantity: 2, expiresAt: new Date(Date.now() - 5000) },
    ];
    (prisma.reservation.findMany as jest.Mock).mockResolvedValue(expiredReservations);
    
    // Mock successful transaction responses (mock the implementations so they pass silently)
    (prisma.reservation.update as jest.Mock).mockResolvedValue({});
    (prisma.product.update as jest.Mock).mockResolvedValue({});
    (prisma.inventoryLog.create as jest.Mock).mockResolvedValue({});

    const released = await ProductService.releaseExpiredReservations();

    expect(released).toHaveLength(2);
    expect(released[0].id).toBe('res-1');
    expect(prisma.reservation.findMany).toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Found 2 expired reservations to release.'));
  });
});
