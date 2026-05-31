import { Request, Response, NextFunction } from 'express';
import { ProductService, ProductQueryOptions } from '../services/product.service';

export class ProductController {
  static async getProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const options: ProductQueryOptions = {
        page: Math.max(1, parseInt(req.query.page as string) || 1),
        limit: Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10)),
        sort: (req.query.sort as string) || 'createdAt',
        order: (req.query.order as string) === 'asc' ? 'asc' : 'desc',
        search: req.query.search as string | undefined,
        category: req.query.category as string | undefined
      };
      const result = await ProductService.getAllProducts(options);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getProductById(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await ProductService.getProductById(req.params.id);
      res.json(product);
    } catch (error) {
      next(error);
    }
  }
}
