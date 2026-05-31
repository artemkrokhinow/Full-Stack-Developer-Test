import { User } from '@prisma/client';
import { hashPassword, comparePassword, generateToken } from '../utils/auth';
import { UserAlreadyExistsException, InvalidCredentialsException, ResourceNotFoundException } from '../utils/errors';
import prisma from '../utils/prisma';

export class AuthService {
  static async register(email: string, password: string): Promise<{ token: string; user: Pick<User, 'id' | 'email'> }> {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new UserAlreadyExistsException();
    }

    const passwordHash = hashPassword(password);
    const user = await prisma.user.create({
      data: { email, passwordHash }
    });

    const token = generateToken(user.id, user.email);
    return { token, user: { id: user.id, email: user.email } };
  }

  static async login(email: string, password: string): Promise<{ token: string; user: Pick<User, 'id' | 'email'> }> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !comparePassword(password, user.passwordHash)) {
      throw new InvalidCredentialsException();
    }

    const token = generateToken(user.id, user.email);
    return { token, user: { id: user.id, email: user.email } };
  }

  static async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        email: true,
        reservations: {
          where: { status: 'PENDING' },
          include: { product: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!user) {
      throw new ResourceNotFoundException('User not found');
    }
    return user;
  }
}
