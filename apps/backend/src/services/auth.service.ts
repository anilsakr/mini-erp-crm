import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { userRepository } from '../repositories/user.repository';
import { AppError } from '../utils/AppError';
import { env } from '../config/env';

export const authService = {
  async login(email: string, password: string) {
    const user = await userRepository.findByEmail(email);

    // Deliberately the same error for "no such user" and "wrong password" —
    // distinguishing them lets an attacker enumerate valid emails.
    if (!user) {
      throw AppError.unauthorized('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw AppError.unauthorized('Invalid email or password');
    }

    const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    } as jwt.SignOptions);

    return {
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  },

  async getProfile(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw AppError.notFound('User');
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  },
};
