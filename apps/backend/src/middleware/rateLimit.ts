import rateLimit from 'express-rate-limit';

// Basic brute-force protection on login. Not a substitute for a real
// account-lockout/backoff strategy, but stops naive credential-stuffing
// scripts — see docs/architecture.md security section for what a production
// system would add on top of this (per-account lockout, CAPTCHA, etc).
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again later.',
    error: { code: 'RATE_LIMITED', details: null },
  },
});
