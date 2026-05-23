const multer = require('multer');
const path = require('path');
const { generateFileName } = require('../utils/helpers');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, generateFileName(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const extAllowed = (process.env.ALLOWED_FILE_TYPES || 'jpeg,jpg,png,tiff,bmp,webp,gif,svg,heic,heif,avif')
    .split(',');

  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  const extOk = extAllowed.includes(ext);

  const allowedMimes = extAllowed.map(t => {
    if (t === 'pdf') return 'application/pdf';
    return `image/${t === 'jpeg' ? 'jpeg' : t === 'jpg' ? 'jpeg' : t}`;
  });
  const mimeOk = allowedMimes.includes(file.mimetype);

  if (mimeOk || extOk) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed`), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024
  },
  fileFilter
});

module.exports = upload;
