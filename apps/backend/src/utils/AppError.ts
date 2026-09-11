// Every deliberate rejection in a service (validation failure, not-found,
// insufficient stock, forbidden, ...) throws an AppError. The central error
// handler middleware (see middleware/errorHandler.ts) is the only place that
// knows how to turn this into an HTTP response, so controllers/services stay
// free of res.status(...) calls.
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(code: string, message: string, details?: unknown) {
    return new AppError(400, code, message, details);
  }

  static unauthorized(message = 'Authentication required') {
    return new AppError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'You do not have permission to perform this action') {
    return new AppError(403, 'FORBIDDEN', message);
  }

  static notFound(resource: string) {
    return new AppError(404, 'NOT_FOUND', `${resource} not found`);
  }

  static conflict(code: string, message: string, details?: unknown) {
    return new AppError(409, code, message, details);
  }
}
