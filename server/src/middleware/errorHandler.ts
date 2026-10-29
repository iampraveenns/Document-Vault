import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import { AppError } from '../utils/AppError.ts';
import { cleanupTempFile, MAX_FILE_SIZE_MB } from '../utils/storage.ts';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Clean up any remaining temporary upload file on error
  if (req.file?.path) {
    cleanupTempFile(req.file.path).catch(() => {});
  }

  // Handle custom AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  // Handle Multer upload errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({
        error: {
          code: 'FILE_TOO_LARGE',
          message: `The uploaded file exceeds the maximum permitted size of ${MAX_FILE_SIZE_MB} MB.`,
        },
      });
      return;
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      res.status(400).json({
        error: {
          code: 'UNEXPECTED_FIELD',
          message: `Unexpected form field '${err.field}'. Please submit files under the 'file' field.`,
        },
      });
      return;
    }

    res.status(400).json({
      error: {
        code: `UPLOAD_ERROR_${err.code}`,
        message: err.message,
      },
    });
    return;
  }

  // Handle Mongoose CastError (e.g., malformed ObjectId)
  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({
      error: {
        code: 'INVALID_DOCUMENT_ID',
        message: `Invalid identifier value provided: '${err.value}'.`,
      },
    });
    return;
  }

  // Handle Mongoose ValidationError
  if (err instanceof mongoose.Error.ValidationError) {
    const messages = Object.values(err.errors).map((e) => e.message);
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: messages.join('; '),
      },
    });
    return;
  }

  // General server error
  console.error('Unhandled internal server error:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal error occurred. Please try again later.',
    },
  });
}
