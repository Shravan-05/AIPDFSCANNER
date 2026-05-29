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
const rateLimiter = require('./middleware/rateLimiter');

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
app.use(rateLimiter);
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/uploads', express.static(UPLOAD_DIR, {
  maxAge: NODE_ENV === 'production' ? '7d' : 0,
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    if (filePath.match(/\.(jpg|jpeg|png|gif|webp|avif|webp)$/i)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
    if (filePath.match(/\.pdf$/i)) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  }
}));

if (hasFrontendBuild) {
  app.use(express.static(frontendBuild, {
    maxAge: '365d',
    immutable: true,
    etag: true,
    lastModified: true
  }));
}

app.get('/api/health', async (req, res) => {
  let ollama = { configured: true, url: process.env.OLLAMA_API_URL || 'http://localhost:11434', model: process.env.OLLAMA_MODEL || 'llama2' };
  let aiService = { configured: !!process.env.AI_SERVICE_URL, url: process.env.AI_SERVICE_URL || '' };
  try {
    const ollamaService = require('./services/ollamaService');
    const [ollamaOk, aiOk] = await Promise.all([
      ollamaService.isAvailable().catch(() => false),
      ollamaService._isAiServiceAvailable().catch(() => false)
    ]);
    ollama.available = ollamaOk;
    ollama.status = ollamaOk ? 'connected' : 'unavailable';
    aiService.available = aiOk;
    aiService.status = aiOk ? 'connected' : 'unavailable';
  } catch {
    ollama.available = false;
    ollama.status = 'error';
  }
  res.status(200).json({
    status: 'ok',
    service: 'AuraScan AI',
    environment: NODE_ENV,
    frontend: hasFrontendBuild ? 'built' : 'api-only',
    ollama,
    aiService,
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({ message: 'AuraScan AI API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/scans', scanRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/pdf', require('./routes/pdfTools'));
app.use('/api', require('./routes/share'));

if (hasFrontendBuild) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendBuild, 'index.html'));
  });
}

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
  maxPoolSize: 50,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4
})
  .then(() => {
    console.log('MongoDB connected');

    // Initialize LangChain service (non-blocking — works without Ollama too)
    const langchain = require('./services/langchainService');
    langchain.initialize().catch(() => {});

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
