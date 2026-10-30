import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';

export type AllowedExtension = '.txt' | '.md' | '.json';
export type AllowedMimeType = 'text/plain' | 'text/markdown' | 'application/json';
export type DocumentStatus = 'ready' | 'deleting';

export interface IDocument extends MongooseDocument {
  userId: mongoose.Types.ObjectId;
  originalName: string;
  s3Key: string;
  bucket: string;
  region: string;
  extension: AllowedExtension;
  mimeType: AllowedMimeType;
  size: number;
  status: DocumentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicDocument {
  _id: string;
  userId?: string;
  originalName: string;
  extension: AllowedExtension;
  mimeType: AllowedMimeType;
  size: number;
  bucket?: string;
  region?: string;
  status: DocumentStatus;
  createdAt: string;
  updatedAt: string;
}

const DocumentSchema = new Schema<IDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    originalName: {
      type: String,
      required: [true, 'Original filename is required'],
      trim: true,
    },
    s3Key: {
      type: String,
      required: [true, 'Cloud S3 object key is required'],
      unique: true,
      index: true,
    },
    bucket: {
      type: String,
      required: [true, 'S3 bucket name is required'],
    },
    region: {
      type: String,
      required: [true, 'S3 region is required'],
    },
    extension: {
      type: String,
      required: [true, 'File extension is required'],
      enum: {
        values: ['.txt', '.md', '.json'],
        message: '{VALUE} is not a supported file extension (.txt, .md, .json required)',
      },
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required'],
      enum: ['text/plain', 'text/markdown', 'application/json'],
    },
    size: {
      type: Number,
      required: [true, 'File size is required'],
      min: [1, 'File cannot be empty'],
    },
    status: {
      type: String,
      enum: ['ready', 'deleting'],
      default: 'ready',
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound index to efficiently query documents for a specific user ordered newest first
DocumentSchema.index({ userId: 1, createdAt: -1, _id: -1 });

export function formatPublicDocument(doc: IDocument): PublicDocument {
  return {
    _id: doc._id.toString(),
    userId: doc.userId ? doc.userId.toString() : undefined,
    originalName: doc.originalName,
    extension: doc.extension,
    mimeType: doc.mimeType,
    size: doc.size,
    bucket: doc.bucket,
    region: doc.region,
    status: doc.status,
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : new Date().toISOString(),
  };
}

export const DocumentModel = mongoose.model<IDocument>('Document', DocumentSchema);
