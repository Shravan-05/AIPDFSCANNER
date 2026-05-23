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
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

fs.promises.mkdir(UPLOAD_DIR, { recursive: true }).catch(() => {});

app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: CORS_ORIGIN === '*' ? '*' : CORS_ORIGIN.split(',').map(s => s.trim()) }));
app.use(compression({ level: 6, threshold: 1024 }));
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const frontendBuild = path.join(__dirname, '..', 'frontend', 'build');
fs.promises.access(frontendBuild).then(() => {
  app.use(express.static(frontendBuild));
}).catch(() => {});

app.get('/', (req, res) => {
  res.json({ message: 'AuraScan AI API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/scans', scanRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/pdf', require('./routes/pdfTools'));

try {
  fs.accessSync(frontendBuild);
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendBuild, 'index.html'));
  });
} catch (e) {}

app.use(errorHandler);

if (!process.env.MONGODB_URI) {
  console.error('FATAL: MONGODB_URI environment variable is not set.');
  console.error('Set it in your deployment dashboard (Render/Railway) or in backend/.env for local dev.');
  process.exit(1);
}
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your_jwt_secret_key_here') {
  console.error('FATAL: JWT_SECRET environment variable is not set or still default.');
  console.error('Generate a strong random secret and set it in your deployment dashboard.');
  process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI, {
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4
})
  .then(() => {
    console.log('MongoDB connected');
    const server = app.listen(PORT, () => {
      console.log(`AuraScan AI server running on port ${PORT} (${NODE_ENV})`);
    });

    const gracefulShutdown = (signal) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      server.close(() => {
        mongoose.connection.close(false).then(() => {
          console.log('Server closed');
          process.exit(0);
        });
      });
      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  })
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    console.error('Server will not start. Check your MONGODB_URI and network access in Atlas.');
    process.exit(1);
  });
