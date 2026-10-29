import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.ts';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(
    new AppError(
      404,
      'ROUTE_NOT_FOUND',
      `Cannot ${req.method} ${req.originalUrl}. Route not found on this server.`
    )
  );
}
