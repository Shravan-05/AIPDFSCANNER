const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const scanRoutes = require('./routes/scans');
const fileRoutes = require('./routes/files');
const settingsRoutes = require('./routes/settings');
const errorHandler = require('./middleware/errorHandler');

const app = express();

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, 'uploads'));
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const frontendBuild = path.join(__dirname, '..', 'frontend', 'build');
const hasFrontendBuild = fs.existsSync(frontendBuild);

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.set('trust proxy', 1);
app.set('etag', 'strong');
app.set('request timeout', 180000);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false
}));
app.use(cors({ origin: CORS_ORIGIN === '*' ? '*' : CORS_ORIGIN.split(',').map(s => s.trim()) }));
app.use(compression({ level: 6, threshold: 256 }));
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));