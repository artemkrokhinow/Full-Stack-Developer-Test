import { Prisma, Product } from '@prisma/client';
import { redis, redisOnline } from '../workers/reservation.worker';
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
  title: string;
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
      title: p.name,
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

  static async releaseExpiredReservations(): Promise<{ id: string; productId: string; quantity: number }[]> {
    const expiredReservations = await prisma.reservation.findMany({
      where: {
        status: 'PENDING',
        expiresAt: { lt: new Date() }
      }
    });

    if (expiredReservations.length === 0) {
      return [];
    }

    logger.info(`Found ${expiredReservations.length} expired reservations to release.`);
    const releasedItems = [];

    for (const res of expiredReservations) {
      try {
        await prisma.$transaction(async (tx) => {
          await tx.reservation.update({
            where: { id: res.id, status: 'PENDING' },
            data: { status: 'EXPIRED' }
          });

          await tx.product.update({
            where: { id: res.productId },
            data: { stock: { increment: res.quantity } }
          });

          await tx.inventoryLog.create({
            data: {
              productId: res.productId,
              change: res.quantity,
              reason: `RESERVATION_EXPIRED:${res.id}`
            }
          });
        });

        if (redisOnline) {
          const updatedProduct = await prisma.product.findUnique({ where: { id: res.productId } });
          if (updatedProduct) {
            await redis.set(`product:${res.productId}:stock`, updatedProduct.stock);
          }
        }

        releasedItems.push({
          id: res.id,
          productId: res.productId,
          quantity: res.quantity
        });
      } catch (err: unknown) {
        logger.error(`Failed to release reservation ${res.id}`, err);
      }
    }

    return releasedItems;
  }
}
