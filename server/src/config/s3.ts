import { S3Client, S3ClientConfig } from '@aws-sdk/client-s3';

const region = process.env.AWS_REGION || 'us-east-1';
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const endpoint = process.env.S3_ENDPOINT;
const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true';

export const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || 'document-vault-bucket';
export const S3_REGION = region;

// Detect if real/usable credentials are provided
const hasValidCredentials = Boolean(
  accessKeyId &&
  secretAccessKey &&
  !accessKeyId.includes('your-aws-access-key') &&
  !accessKeyId.includes('MY_AWS_ACCESS_KEY')
);

export const isCloudS3Configured = hasValidCredentials;

const clientConfig: S3ClientConfig = {
  region,
};

if (hasValidCredentials) {
  clientConfig.credentials = {
    accessKeyId: accessKeyId!,
    secretAccessKey: secretAccessKey!,
  };
} else {
  // Provide mock/dummy credentials for local development or testing when unset
  clientConfig.credentials = {
    accessKeyId: 'mock-access-key',
    secretAccessKey: 'mock-secret-key',
  };
}

if (endpoint) {
  clientConfig.endpoint = endpoint;
}

if (forcePathStyle) {
  clientConfig.forcePathStyle = forcePathStyle;
}

export const s3Client = new S3Client(clientConfig);
