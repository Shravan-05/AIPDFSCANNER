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

// Support ALL image formats - comprehensive list
const fileFilter = (req, file, cb) => {
  const allImageExtensions = [
    'jpeg', 'jpg', 'png', 'gif', 'bmp', 'tiff', 'tif', 'webp', 'svg', 'svgz',
    'ico', 'cur', 'heic', 'heif', 'avif', 'jfif', 'pjpeg', 'pjp', 'apng', 'jp2', 'j2k',
    'jpf', 'jpx', 'jpm', 'mj2', 'dds', 'eps', 'hdr', 'pic', 'pict', 'psd', 'raw',
    'xbm', 'xpm', 'pcx', 'dcx', 'flif', 'bpg', 'ktx', 'pkm', 'astc', 'tga',
    'ppm', 'pgm', 'pbm', 'pnm', 'pfm', 'ras', 'sgi', 'rgb', 'rgba', 'bw',
    'exif', 'exr', 'jp2000', 'jpe', 'bmp2', 'dib', 'pdf'
  ];
  
  const extAllowed = (process.env.ALLOWED_FILE_TYPES || allImageExtensions.join(','))
    .split(',')
    .map(e => e.trim().toLowerCase());

  const ext = path.extname(file.originalname).toLowerCase().replace('.', '').trim();
  const extOk = extAllowed.includes(ext);

  if (extOk) return cb(null, true);
  if (file.mimetype && file.mimetype.startsWith('image/')) return cb(null, true);
  if (file.mimetype && file.mimetype.startsWith('application/pdf')) return cb(null, true);

  cb(new Error(`File type '${ext}' not allowed`), false);
};

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024
  },
  fileFilter
});

module.exports = upload;
