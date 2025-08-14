import multer from "multer";
import { FILE_UPLOAD, MULTER_ERROR_CODES, ERROR_MESSAGES } from "../utils/constants.js";

const getAllowedTypes = () => {
  return Object.values(FILE_UPLOAD.ALLOWED_FILE_TYPES).flat();
};

const fileFilter = (req, file, cb) => {
  const allowedTypes = getAllowedTypes();
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(', ')}`), false);
  }
};


const storage = multer.memoryStorage();

// Multer configuration
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: FILE_UPLOAD.MAX_FILE_SIZE,
    files: FILE_UPLOAD.MAX_FILES_COUNT,
  },
});

export const uploadSingle = upload.single('file');

export const uploadMultiple = upload.array('files', FILE_UPLOAD.MAX_FILES_COUNT);

export const validateFile = (req, res, next) => {
  if (!req.file && !req.files) {
    return res.status(400).json({
      success: false,
      message: ERROR_MESSAGES.NO_FILE_UPLOADED
    });
  }
  
  // Add file metadata to request
  if (req.file) {
    req.fileInfo = {
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      buffer: req.file.buffer
    };
  }
  
  if (req.files) {
    req.filesInfo = req.files.map(file => ({
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      buffer: file.buffer
    }));
  }
  
  next();
};

// Error handling middleware for multer
export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === MULTER_ERROR_CODES.LIMIT_FILE_SIZE) {
      return res.status(400).json({
        success: false,
        message: ERROR_MESSAGES.FILE_SIZE_TOO_LARGE
      });
    }
    
    if (err.code === MULTER_ERROR_CODES.LIMIT_FILE_COUNT) {
      return res.status(400).json({
        success: false,
        message: ERROR_MESSAGES.TOO_MANY_FILES
      });
    }
    
    if (err.code === MULTER_ERROR_CODES.LIMIT_UNEXPECTED_FILE) {
      return res.status(400).json({
        success: false,
        message: ERROR_MESSAGES.UNEXPECTED_FIELD
      });
    }
  }
  
  if (err.message.includes('File type')) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  
  next(err);
};
