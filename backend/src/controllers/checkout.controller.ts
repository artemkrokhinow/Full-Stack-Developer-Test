import { Response, NextFunction } from 'express';
import { CheckoutService } from '../services/checkout.service';
import { AuthRequest } from '../utils/auth';

export class CheckoutController {
  static async reserve(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // userId comes from JWT token, NOT from request body (security)
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { productId, quantity, idempotencyKey } = req.body;
      const reservation = await CheckoutService.reserve(userId, productId, quantity, idempotencyKey);
      res.status(202).json({
        message: 'Reservation is being processed',
        reservations: [reservation]
      });
    } catch (error) {
      next(error);
    }
  }

  static async checkout(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { reservationId } = req.body;
      await CheckoutService.confirmCheckout(reservationId);
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  static async status(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const statusData = await CheckoutService.getReservationStatus(id);
      res.json(statusData);
    } catch (error) {
      next(error);
    }
  }
}
