import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';

export type AllowedExtension = '.txt' | '.md' | '.json';
export type AllowedMimeType = 'text/plain' | 'text/markdown' | 'application/json';
export type DocumentStatus = 'ready' | 'deleting';

export interface IDocument extends MongooseDocument {
  originalName: string;
  storedName: string;
  extension: AllowedExtension;
  mimeType: AllowedMimeType;
  size: number;
  storagePath: string;
  status: DocumentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicDocument {
  _id: string;
  originalName: string;
  extension: AllowedExtension;
  mimeType: AllowedMimeType;
  size: number;
  status: DocumentStatus;
  createdAt: string;
  updatedAt: string;
}

const DocumentSchema = new Schema<IDocument>(
  {
    originalName: {
      type: String,
      required: [true, 'Original filename is required'],
      trim: true,
    },
    storedName: {
      type: String,
      required: [true, 'Storage filename is required'],
      unique: true,
      index: true,
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
    storagePath: {
      type: String,
      required: [true, 'Storage path is required'],
      select: false, // Exclude by default from queries to prevent leakage
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
        delete ret.storagePath;
        delete ret.storedName;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Index to efficiently query documents ordered newest first
DocumentSchema.index({ createdAt: -1, _id: -1 });

export function formatPublicDocument(doc: IDocument): PublicDocument {
  return {
    _id: doc._id.toString(),
    originalName: doc.originalName,
    extension: doc.extension,
    mimeType: doc.mimeType,
    size: doc.size,
    status: doc.status,
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : new Date().toISOString(),
  };
}

export const DocumentModel = mongoose.model<IDocument>('Document', DocumentSchema);
