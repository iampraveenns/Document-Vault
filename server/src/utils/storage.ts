import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import { s3Client, S3_BUCKET_NAME, S3_REGION, isCloudS3Configured } from '../config/s3.ts';
import { AppError } from './AppError.ts';

export const MAX_FILE_SIZE_MB = Number(process.env.MAX_FILE_SIZE_MB) || 5;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// In-memory simulation store for local development when real AWS credentials are not yet configured
interface SimulatedObject {
  buffer: Buffer;
  contentType: string;
  metadata?: Record<string, string>;
  createdAt: Date;
}
const localS3MemoryStore = new Map<string, SimulatedObject>();

/**
 * Upload a document buffer directly to S3 / Cloud Object Storage.
 */
export async function uploadObjectToStorage(
  key: string,
  buffer: Buffer,
  contentType: string,
  metadata?: Record<string, string>
): Promise<{ key: string; bucket: string; region: string }> {
  try {
    if (isCloudS3Configured) {
      const command = new PutObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ContentLength: buffer.length,
        Metadata: metadata,
      });

      await s3Client.send(command);
    } else {
      // In-memory S3 simulation for local development / testing
      localS3MemoryStore.set(key, {
        buffer,
        contentType,
        metadata,
        createdAt: new Date(),
      });
    }

    return {
      key,
      bucket: S3_BUCKET_NAME,
      region: S3_REGION,
    };
  } catch (error: any) {
    console.error(`S3 PutObject error for key "${key}":`, error);
    // If cloud call fails due to invalid credentials, record in local store as fallback in dev
    if (process.env.NODE_ENV !== 'production' && (error.name === 'CredentialsProviderError' || error.name === 'InvalidAccessKeyId')) {
      localS3MemoryStore.set(key, { buffer, contentType, metadata, createdAt: new Date() });
      return { key, bucket: S3_BUCKET_NAME, region: S3_REGION };
    }
    throw new AppError(500, 'S3_UPLOAD_ERROR', `Failed to upload file to cloud object storage: ${error.message}`);
  }
}

/**
 * Stream an object directly from S3 / Cloud Object Storage.
 */
export async function getObjectStreamFromStorage(
  key: string
): Promise<{ stream: Readable; contentType: string; contentLength?: number }> {
  try {
    if (isCloudS3Configured) {
      const command = new GetObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: key,
      });

      const response = await s3Client.send(command);
      if (!response.Body) {
        throw new AppError(404, 'EMPTY_OBJECT_STREAM', 'Object body is empty.');
      }

      // Convert response.Body to Node.js Readable stream
      const stream = response.Body as Readable;
      return {
        stream,
        contentType: response.ContentType || 'application/octet-stream',
        contentLength: response.ContentLength,
      };
    }

    // Fallback to local memory simulation
    const item = localS3MemoryStore.get(key);
    if (!item) {
      throw new AppError(404, 'FILE_MISSING_IN_STORAGE', 'File not found in object storage.');
    }

    const readable = Readable.from(item.buffer);
    return {
      stream: readable,
      contentType: item.contentType,
      contentLength: item.buffer.length,
    };
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      throw new AppError(404, 'FILE_MISSING_IN_STORAGE', 'The physical file was not found in cloud storage.');
    }
    // Check if in local store as fallback
    const item = localS3MemoryStore.get(key);
    if (item) {
      return {
        stream: Readable.from(item.buffer),
        contentType: item.contentType,
        contentLength: item.buffer.length,
      };
    }
    console.error(`S3 GetObject stream error for key "${key}":`, error);
    throw new AppError(500, 'S3_GET_STREAM_ERROR', `Failed to retrieve object from storage: ${error.message}`);
  }
}

/**
 * Read the entire object from storage as a UTF-8 string for in-browser preview.
 */
export async function getObjectStringFromStorage(key: string): Promise<string> {
  try {
    if (isCloudS3Configured) {
      const command = new GetObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: key,
      });

      const response = await s3Client.send(command);
      if (!response.Body) {
        return '';
      }

      const stream = response.Body as Readable;
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return Buffer.concat(chunks).toString('utf-8');
    }

    const item = localS3MemoryStore.get(key);
    if (!item) {
      throw new AppError(404, 'FILE_MISSING_IN_STORAGE', 'The requested object is not in storage.');
    }
    return item.buffer.toString('utf-8');
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      throw new AppError(404, 'FILE_MISSING_IN_STORAGE', 'The requested file was not found in object storage.');
    }
    const item = localS3MemoryStore.get(key);
    if (item) {
      return item.buffer.toString('utf-8');
    }
    console.error(`S3 GetObject string error for key "${key}":`, error);
    throw new AppError(500, 'S3_GET_STRING_ERROR', `Failed to read document content: ${error.message}`);
  }
}

/**
 * Generate a pre-signed ephemeral GET URL for client-direct download.
 */
export async function generatePresignedDownloadUrl(
  key: string,
  originalFilename: string,
  expiresInSeconds = 3600
): Promise<string> {
  try {
    const encodedFilename = encodeURIComponent(originalFilename);
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${originalFilename.replace(/"/g, '\\"')}"; filename*=UTF-8''${encodedFilename}`,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: expiresInSeconds,
    });
    return presignedUrl;
  } catch (error: any) {
    console.warn(`Could not generate presigned URL for key "${key}" (${error.message}). Direct streaming will be used.`);
    return '';
  }
}

/**
 * Delete an object from S3 / Cloud Object Storage.
 * Idempotent: if already missing, does not throw an error.
 */
export async function deleteObjectFromStorage(key: string): Promise<boolean> {
  try {
    localS3MemoryStore.delete(key);

    if (isCloudS3Configured) {
      const command = new DeleteObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: key,
      });

      await s3Client.send(command);
    }
    return true;
  } catch (error: any) {
    console.error(`S3 DeleteObject error for key "${key}":`, error);
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw new AppError(500, 'S3_DELETE_ERROR', `Failed to delete file from object storage: ${error.message}`);
  }
}

/**
 * Check if an object exists in storage via HeadObject.
 */
export async function objectExistsInStorage(key: string): Promise<boolean> {
  if (localS3MemoryStore.has(key)) return true;

  if (!isCloudS3Configured) return false;

  try {
    const command = new HeadObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
    });
    await s3Client.send(command);
    return true;
  } catch (error: any) {
    if (error.name === 'NotFound' || error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    return false;
  }
}
