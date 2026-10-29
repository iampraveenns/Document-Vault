import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { AppError } from '../utils/AppError.ts';
import { cleanupTempFile, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from '../utils/storage.ts';
import { AllowedExtension, AllowedMimeType } from '../models/Document.ts';

export interface ValidatedFileInfo {
  originalName: string;
  tempPath: string;
  extension: AllowedExtension;
  mimeType: AllowedMimeType;
  size: number;
}

declare global {
  namespace Express {
    interface Request {
      validatedFile?: ValidatedFileInfo;
    }
  }
}

const ALLOWED_EXTENSIONS: Record<string, { ext: AllowedExtension; mime: AllowedMimeType }> = {
  '.txt': { ext: '.txt', mime: 'text/plain' },
  '.md': { ext: '.md', mime: 'text/markdown' },
  '.json': { ext: '.json', mime: 'application/json' },
};

/**
 * Validates text encoding: Checks for invalid UTF-8 sequences and forbidden null bytes.
 */
function isValidUTF8(buffer: Buffer): boolean {
  // Check for null bytes which indicate binary data
  for (let i = 0; i < buffer.length; i++) {
    if (buffer[i] === 0x00) {
      return false;
    }
  }

  // Check valid UTF-8 decoding
  const decoder = new TextDecoder('utf-8', { fatal: true });
  try {
    decoder.decode(buffer);
    return true;
  } catch {
    return false;
  }
}

export async function validateDocument(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const file = req.file;

  if (!file) {
    return next(new AppError(400, 'MISSING_FILE', 'No file uploaded. Please provide a file in the "file" field.'));
  }

  const tempPath = file.path;

  try {
    // 1. Extension normalization & allowlist check
    const rawExt = path.extname(file.originalname).toLowerCase();
    const config = ALLOWED_EXTENSIONS[rawExt];

    if (!config) {
      await cleanupTempFile(tempPath);
      return next(
        new AppError(
          415,
          'UNSUPPORTED_MEDIA_TYPE',
          `Unsupported file extension '${rawExt || 'unknown'}'. Only .txt, .md, and .json files are supported.`
        )
      );
    }

    // 2. Size limit check
    if (file.size > MAX_FILE_SIZE_BYTES) {
      await cleanupTempFile(tempPath);
      return next(
        new AppError(
          413,
          'FILE_TOO_LARGE',
          `File size exceeds the allowed limit of ${MAX_FILE_SIZE_MB} MB.`
        )
      );
    }

    // 3. Empty file check (raw file size)
    if (file.size === 0) {
      await cleanupTempFile(tempPath);
      return next(new AppError(400, 'EMPTY_FILE', 'The uploaded file is empty (0 bytes).'));
    }

    // 4. Read file content from temporary path
    const fileBuffer = await fs.promises.readFile(tempPath);

    // 5. Enforce UTF-8 policy & non-binary content
    if (!isValidUTF8(fileBuffer)) {
      await cleanupTempFile(tempPath);
      return next(
        new AppError(
          400,
          'INVALID_ENCODING',
          'File contains non-UTF-8 characters or binary content. Only valid UTF-8 text files are permitted.'
        )
      );
    }

    const textContent = fileBuffer.toString('utf-8');

    // 6. Check empty content after trimming whitespace
    if (textContent.trim().length === 0) {
      await cleanupTempFile(tempPath);
      return next(
        new AppError(400, 'EMPTY_FILE', 'The uploaded file contains only whitespace or is empty.')
      );
    }

    // 7. Strict JSON syntax check for .json files
    if (config.ext === '.json') {
      try {
        JSON.parse(textContent);
      } catch (jsonErr: any) {
        await cleanupTempFile(tempPath);
        return next(
          new AppError(
            400,
            'MALFORMED_JSON',
            `Invalid JSON content: ${jsonErr.message || 'JSON parsing failed'}`
          )
        );
      }
    }

    // Attach validated details
    req.validatedFile = {
      originalName: file.originalname,
      tempPath,
      extension: config.ext,
      mimeType: config.mime,
      size: file.size,
    };

    next();
  } catch (error) {
    await cleanupTempFile(tempPath);
    next(error);
  }
}
