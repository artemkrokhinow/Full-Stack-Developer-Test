import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticateToken } from '../utils/auth';
import { validateBody } from '../middleware/validate';
import { z } from 'zod';

export const authRouter = Router();

const RegisterSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters')
  })
});

const LoginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters')
  })
});

authRouter.post('/register', validateBody(RegisterSchema), AuthController.register);
authRouter.post('/login', validateBody(LoginSchema), AuthController.login);
authRouter.get('/me', authenticateToken, AuthController.getMe);
