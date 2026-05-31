import { Router } from 'express';
import { CheckoutController } from '../controllers/checkout.controller';
import { z } from 'zod';
import { validate } from '../middleware/validate';

export const checkoutRouter = Router();

const reserveSchema = z.object({
  body: z.object({
    userId: z.string().uuid(),
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
    idempotencyKey: z.string().uuid().optional() // Make it optional for backward compatibility
  })
});

const checkoutSchema = z.object({
  body: z.object({
    reservationId: z.string().uuid()
  })
});

checkoutRouter.post('/reserve', validate(reserveSchema), CheckoutController.reserve);
checkoutRouter.post('/', validate(checkoutSchema), CheckoutController.checkout);
checkoutRouter.post('/confirm', validate(checkoutSchema), CheckoutController.checkout);
checkoutRouter.get('/status/:id', CheckoutController.status);
