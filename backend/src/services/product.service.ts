import { Prisma, Product } from '@prisma/client';
import { logger } from '../utils/logger';
import prisma from '../utils/prisma';

import { ResourceNotFoundException } from '../utils/errors';

export interface ProductQueryOptions {
  page: number;
  limit: number;
  sort: string;
  order: 'asc' | 'desc';
  search?: string;
  category?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface FormattedProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  badge: string | null;
  description: string;
}

export class ProductService {
  static formatProduct(p: Product): FormattedProduct {
    return {
      id: p.id,
      name: p.name,
      price: p.price / 100,
      stock: p.stock,
      category: p.category,
      badge: p.badge,
      description: p.description
    };
  }

  static async getAllProducts(options: ProductQueryOptions): Promise<PaginatedResult<FormattedProduct>> {
    const { page, limit, sort, order, search, category } = options;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }
    if (category) {
      where.category = category;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sort]: order }
      }),
      prisma.product.count({ where })
    ]);

    return {
      data: products.map(ProductService.formatProduct),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async getProductById(id: string): Promise<FormattedProduct> {
    const productRecord = await prisma.product.findUnique({ where: { id } });
    if (!productRecord) {
      throw new ResourceNotFoundException('Product not found');
    }
    return this.formatProduct(productRecord);
  }

  static async releaseExpiredReservations(): Promise<void> {
    // Выбираем ограниченный батч для предотвращения долгих блокировок таблиц
    const expiredReservations = await prisma.reservation.findMany({
      where: { status: 'PENDING', expiresAt: { lt: new Date() } },
      take: 50 
    });

    for (const res of expiredReservations) {
      await prisma.$transaction(async (tx) => {
        // Идемпотентная проверка: обновляем только если статус все еще PENDING
        // Защита от гонки, если пользователь параллельно успел нажать Checkout [2, 3]
        const updated = await tx.reservation.updateMany({
          where: { id: res.id, status: 'PENDING' },
          data: { status: 'EXPIRED' }
        });

        // Если updateMany вернул count > 0, значит эта транзакция "выиграла" гонку
        if (updated.count > 0) {
          await tx.product.update({
            where: { id: res.productId },
            data: { stock: { increment: res.quantity } }
          });

          // Атомарная запись в аудит-лог (требование ТЗ) [3]
          await tx.inventoryLog.create({
            data: {
              productId: res.productId,
              change: res.quantity,
              reason: `RESERVATION_EXPIRED:${res.id}`
            }
          });
        }
      });
    }
  }
}
