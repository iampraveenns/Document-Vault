import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt.ts';
import { AppError } from '../utils/AppError.ts';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(
      new AppError(
        401,
        'UNAUTHORIZED',
        'Authentication required. Please provide a valid Bearer token in the Authorization header.'
      )
    );
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return next(
      new AppError(401, 'UNAUTHORIZED', 'Malformed Authorization header. Format: Bearer <token>')
    );
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    next(err);
  }
}
