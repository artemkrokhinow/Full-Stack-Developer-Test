import { Request, Response, NextFunction } from 'express';
import { CheckoutService } from '../services/checkout.service';

export class CheckoutController {
  static async reserve(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, productId, quantity, idempotencyKey } = req.body;
      const reservation = await CheckoutService.reserve(userId, productId, quantity, idempotencyKey);
      res.status(202).json({
        message: 'Reservation is being processed',
        reservations: [reservation]
      });
    } catch (error) {
      next(error);
    }
  }

  static async checkout(req: Request, res: Response, next: NextFunction) {
    try {
      const { reservationId } = req.body;
      await CheckoutService.confirmCheckout(reservationId);
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  static async status(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const statusData = await CheckoutService.getReservationStatus(id);
      res.json(statusData);
    } catch (error) {
      next(error);
    }
  }
}
