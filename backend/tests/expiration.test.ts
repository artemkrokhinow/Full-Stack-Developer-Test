import { ProductService } from '../src/services/product.service';
import prisma from '../src/utils/prisma';

jest.mock('../src/utils/prisma', () => ({
  __esModule: true,
  default: {
    reservation: { findMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));

describe('ProductService.releaseExpiredReservations', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should do nothing when no expired reservations exist', async () => {
    (prisma.reservation.findMany as jest.Mock).mockResolvedValue([]);
    await ProductService.releaseExpiredReservations();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('should expire reservations and restore stock in batches', async () => {
    const mockExpired = [
      { id: 'res-1', productId: 'prod-1', quantity: 2, status: 'PENDING', expiresAt: new Date(Date.now() - 1000) },
      { id: 'res-2', productId: 'prod-2', quantity: 1, status: 'PENDING', expiresAt: new Date(Date.now() - 5000) },
    ];
    (prisma.reservation.findMany as jest.Mock).mockResolvedValue(mockExpired);

    // Mock $transaction to execute the callback with a mock tx
    (prisma.$transaction as jest.Mock).mockImplementation(async (cb: (tx: any) => Promise<void>) => {
      const tx = {
        reservation: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        product: {
          update: jest.fn().mockResolvedValue({}),
        },
        inventoryLog: {
          create: jest.fn().mockResolvedValue({}),
        },
      };
      await cb(tx);
      return tx;
    });

    await ProductService.releaseExpiredReservations();

    // Should have been called once per expired reservation
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
  });

  it('should NOT restore stock if reservation was already processed (race condition guard)', async () => {
    const mockExpired = [
      { id: 'res-1', productId: 'prod-1', quantity: 1, status: 'PENDING', expiresAt: new Date(Date.now() - 1000) },
    ];
    (prisma.reservation.findMany as jest.Mock).mockResolvedValue(mockExpired);

    let capturedTx: any;
    (prisma.$transaction as jest.Mock).mockImplementation(async (cb: (tx: any) => Promise<void>) => {
      capturedTx = {
        reservation: {
          updateMany: jest.fn().mockResolvedValue({ count: 0 }), // Already processed!
        },
        product: {
          update: jest.fn(),
        },
        inventoryLog: {
          create: jest.fn(),
        },
      };
      await cb(capturedTx);
    });

    await ProductService.releaseExpiredReservations();

    // Product stock should NOT be incremented because updateMany returned count: 0
    expect(capturedTx.product.update).not.toHaveBeenCalled();
    expect(capturedTx.inventoryLog.create).not.toHaveBeenCalled();
  });
});
