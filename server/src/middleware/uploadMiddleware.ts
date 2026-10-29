import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { TEMP_DIR, MAX_FILE_SIZE_BYTES } from '../utils/storage.ts';
import { AppError } from '../utils/AppError.ts';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, TEMP_DIR);
  },
  filename: (_req, file, cb) => {
    const rawExt = path.extname(file.originalname).toLowerCase();
    const tempName = `temp-${Date.now()}-${uuidv4()}${rawExt}`;
    cb(null, tempName);
  },
});

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
