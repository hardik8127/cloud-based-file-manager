// File upload constants
export const FILE_UPLOAD = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_FILES_COUNT: 10,
  ALLOWED_FILE_TYPES: {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
    video: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv'],
    audio: ['audio/mp3', 'audio/wav', 'audio/ogg'],
    archive: ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed']
  }
};

// Multer error codes
export const MULTER_ERROR_CODES = {
  LIMIT_FILE_SIZE: 'LIMIT_FILE_SIZE',
  LIMIT_FILE_COUNT: 'LIMIT_FILE_COUNT',
  LIMIT_UNEXPECTED_FILE: 'LIMIT_UNEXPECTED_FILE',
  LIMIT_PART_COUNT: 'LIMIT_PART_COUNT',
  LIMIT_FIELD_KEY: 'LIMIT_FIELD_KEY',
  LIMIT_FIELD_VALUE: 'LIMIT_FIELD_VALUE',
  LIMIT_FIELD_COUNT: 'LIMIT_FIELD_COUNT',
  UNEXPECTED_FILE: 'UNEXPECTED_FILE'
};

// Error messages
export const ERROR_MESSAGES = {
  NO_FILE_UPLOADED: 'No file uploaded',
  FILE_SIZE_TOO_LARGE: `File size too large. Maximum size is ${FILE_UPLOAD.MAX_FILE_SIZE / (1024 * 1024)}MB`,
  TOO_MANY_FILES: `Too many files. Maximum ${FILE_UPLOAD.MAX_FILES_COUNT} files allowed`,
  UNEXPECTED_FIELD: 'Unexpected field name',
  FILE_TYPE_NOT_ALLOWED: 'File type not allowed'
};