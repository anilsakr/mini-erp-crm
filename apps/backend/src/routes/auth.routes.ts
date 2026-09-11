import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { loginRateLimiter } from '../middleware/rateLimit';
import { loginSchema } from '../validators/auth.validator';

export const authRouter = Router();

authRouter.post('/login', loginRateLimiter, validate(loginSchema), authController.login);
authRouter.get('/me', authenticate, authController.me);
