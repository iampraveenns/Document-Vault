import multer from 'multer';
import path from 'path';
import { MAX_FILE_SIZE_BYTES } from '../utils/storage.ts';
import { AppError } from '../utils/AppError.ts';

// In-memory storage: no temporary files are written to the local filesystem
const storage = multer.memoryStorage();

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.txt', '.md', '.json'];

  if (!allowedExtensions.includes(ext)) {
    return cb(
      new AppError(
        415,
        'UNSUPPORTED_MEDIA_TYPE',
        `Unsupported file type '${ext || 'unknown'}'. Only .txt, .md, and .json files are supported.`
      )
    );
  }

  cb(null, true);
};

export const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1,
  },
  fileFilter,
});

export const uploadSingleFile = upload.single('file');
