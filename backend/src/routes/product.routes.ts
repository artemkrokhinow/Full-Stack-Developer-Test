import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { z } from 'zod';
import { validateBody } from '../middleware/validate';

export const productRouter = Router();

const productIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid product ID format')
  })
});

productRouter.get('/', ProductController.getProducts);
productRouter.get('/:id', validateBody(productIdSchema), ProductController.getProductById);
