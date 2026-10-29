import fs from 'fs';
import path from 'path';
import { AppError } from './AppError.ts';

// Configurable storage paths from environment or defaults
export const TEMP_DIR = path.resolve(process.env.TEMP_UPLOAD_DIR || './storage/tmp');
export const DOCUMENTS_DIR = path.resolve(process.env.UPLOAD_DIR || './storage/documents');
export const MAX_FILE_SIZE_MB = Number(process.env.MAX_FILE_SIZE_MB) || 5;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * Ensure storage directories exist synchronously or asynchronously on startup.
 */
export async function ensureStorageDirectories(): Promise<void> {
  try {
    await fs.promises.mkdir(TEMP_DIR, { recursive: true });
    await fs.promises.mkdir(DOCUMENTS_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create storage directories:', error);
    throw new AppError(500, 'STORAGE_INIT_ERROR', 'Failed to initialize local storage directories.');
  }
}

/**
 * Safely move a file from temporary directory to permanent storage.
 * Handles cross-device link issues by falling back to copy + unlink.
 */
export async function moveToPermanentStorage(tempPath: string, destinationFilename: string): Promise<string> {
  const destinationPath = path.join(DOCUMENTS_DIR, destinationFilename);

  // Security check: ensure destination resides inside DOCUMENTS_DIR
  if (!destinationPath.startsWith(DOCUMENTS_DIR)) {
    throw new AppError(400, 'PATH_TRAVERSAL_DETECTED', 'Invalid file storage destination.');
  }

  try {
    await fs.promises.rename(tempPath, destinationPath);
  } catch (err: any) {
    // If EXDEV (cross-device move), copy and delete source
    if (err.code === 'EXDEV') {
      await fs.promises.copyFile(tempPath, destinationPath);
      await fs.promises.unlink(tempPath).catch(() => {});
    } else {
      throw err;
    }
  }

  return destinationPath;
}

/**
 * Safely removes a file from permanent storage.
 * If the file is already missing, treats it as recoverable/absent without error.
 */
export async function deleteStoredFile(filename: string): Promise<boolean> {
  const filePath = path.join(DOCUMENTS_DIR, path.basename(filename));

  try {
    await fs.promises.unlink(filePath);
    return true;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // File already missing, consider it cleaned up
      return false;
    }
    console.error(`Error deleting file at ${filePath}:`, error);
    throw new AppError(500, 'FILE_DELETE_ERROR', 'Failed to delete physical file from storage.');
  }
}

/**
 * Cleans up temporary upload file safely without throwing uncaught errors.
 */
export async function cleanupTempFile(filePath?: string): Promise<void> {
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch (err: any) {
    if (err.code !== 'ENOENT') {
      console.warn(`Warning: Could not remove temporary file ${filePath}:`, err.message);
    }
  }
}

/**
 * Check if a file exists on disk.
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve absolute path for a stored document safely.
 */
export function getStoredFilePath(storedName: string): string {
  const safeFilename = path.basename(storedName);
  return path.join(DOCUMENTS_DIR, safeFilename);
}
