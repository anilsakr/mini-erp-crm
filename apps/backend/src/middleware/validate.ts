import { NextFunction, Request, Response } from 'express';
import { AnyZodObject } from 'zod';

// Validates and REPLACES req.body/query/params with the parsed (and
// type-coerced, e.g. string->number for query params) result, so controllers
// downstream can trust the shape without re-checking it.
//
// Note: req.query is a getter-only property on Express's request prototype
// (it re-parses the URL on every access), so a plain `req.query = x`
// assignment throws under TypeScript's strict-mode output. We use
// defineProperty to replace it with a plain writable value for this request.
export function validate(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.parse({ body: req.body, query: req.query, params: req.params });
    if (parsed.body) req.body = parsed.body;
    if (parsed.query) {
      Object.defineProperty(req, 'query', {
        value: parsed.query,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }
    if (parsed.params) req.params = parsed.params;
    next();
  };
}
