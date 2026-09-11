import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

// Verifies the Bearer token and attaches the decoded user to req.user.
// Every route except /health and /api/auth/login goes through this.
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw AppError.unauthorized('Missing or malformed Authorization header');
  }

  const token = header.slice('Bearer '.length);

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch {
    throw AppError.unauthorized('Invalid or expired token');
  }
}

// Role check is a separate middleware from authentication on purpose: it
// keeps "who are you" and "are you allowed to do this" as independently
// testable, composable steps, e.g. requireRole('ADMIN', 'WAREHOUSE').
export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw AppError.unauthorized();
    }
    if (!allowedRoles.includes(req.user.role)) {
      throw AppError.forbidden(
        `This action requires one of the following roles: ${allowedRoles.join(', ')}`,
      );
    }
    next();
  };
}
