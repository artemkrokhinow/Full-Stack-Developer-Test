import { Reservation } from '@prisma/client';
import crypto from 'crypto';
import { ProductService } from './product.service';
import { loggerContext } from '../utils/logger';
import { DomainError, OutOfStockException, ResourceNotFoundException, InvalidReservationError } from '../utils/errors';
import prisma from '../utils/prisma';
import { RESERVATION_EXPIRATION_MS } from '../config/env';

interface PrismaError {
  code: string;
  meta?: { target?: string[] };
}

function isPrismaError(err: unknown): err is PrismaError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as PrismaError).code === 'string'
  );
}

export class CheckoutService {
  static async reserve(userId: string, productId: string, quantity: number, idempotencyKey?: string): Promise<{ id: string; expiresAt: Date }> {
    const targetIdempotencyKey = idempotencyKey || crypto.randomUUID();

    try {
      return await prisma.$transaction(async (tx) => {
        // Атомарное декрементирование с проверкой остатка
        const productUpdate = await tx.product.updateMany({
          where: { id: productId, stock: { gte: quantity } },
          data: { stock: { decrement: quantity } }
        });

        if (productUpdate.count === 0) {
          throw Object.assign(new Error('Record to update not found.'), { code: 'P2025' });
        }

        const reservation = await tx.reservation.create({
          data: {
            userId,
            productId,
            quantity,
            idempotencyKey: targetIdempotencyKey,
            expiresAt: new Date(Date.now() + RESERVATION_EXPIRATION_MS)
          }
        });

        // Транзакционная запись в аудит-лог
        await tx.inventoryLog.create({
          data: {
            productId,
            change: -quantity,
            reason: `RESERVATION_CREATED:${reservation.id}`
          }
        });

        return { id: reservation.id, expiresAt: reservation.expiresAt };
      });
    } catch (err: any) {
      if (err.code === 'P2002' && err.meta?.target?.includes('idempotencyKey')) {
        // Идемпотентный возврат при дублирующем запросе
        const existing = await prisma.reservation.findUniqueOrThrow({ where: { idempotencyKey: targetIdempotencyKey } });
        return { id: existing.id, expiresAt: existing.expiresAt };
      }
      if (err.code === 'P2025') {
        throw new OutOfStockException('Not enough stock or product not found');
      }
      throw err;
    }
  }

  static async confirmCheckout(reservationId: string): Promise<boolean> {
    try {
      await prisma.$transaction(async (tx) => {
        const reservation = await tx.reservation.update({
          where: { id: reservationId, status: 'PENDING' },
          data: { status: 'COMPLETED' },
          include: { product: true }
        });

        await tx.order.create({
          data: {
            userId: reservation.userId,
            productId: reservation.productId,
            reservationId: reservation.id,
            quantity: reservation.quantity,
            totalAmount: reservation.product.price * reservation.quantity,
          }
        });
      });
      return true;
    } catch (err: any) {
      // Безопасная отработка гонки (идемпотентность)
      if (err.code === 'P2025') {
        const existingOrder = await prisma.order.findUnique({ where: { reservationId } });
        if (existingOrder) return true; // Заказ уже был успешно оформлен
        
        throw new InvalidReservationError('Reservation already completed, expired or not found');
      }
      if (err.code === 'P2002' && err.meta?.target?.includes('reservationId')) {
        return true; // Idempotent return
      }
      throw err;
    }
  }

  static async getReservationStatus(id: string): Promise<{ status: 'completed' | 'processing' | 'failed'; reservation?: Reservation; error?: string }> {
    const reservation = await prisma.reservation.findUnique({ where: { id } });

    if (reservation) {
      return { status: 'completed', reservation };
    }

    throw new ResourceNotFoundException('Reservation not found');
  }
}
