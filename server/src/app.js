const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const { errorHandler } = require('./middleware/error.middleware');
const { generalLimiter } = require('./middleware/rateLimit.middleware');
const logger = require('./utils/logger');

// Route Imports
const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const cartRoutes = require('./routes/cart.routes');
const orderRoutes = require('./routes/order.routes');
const paymentRoutes = require('./routes/payment.routes');
const securityRoutes = require('./routes/security.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();

// Security Headers (Configure CSP to allow camera access, Tailwind CDN, and external media)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net", "https://unpkg.com", "https://cdn.tailwindcss.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net", "https://cdn.tailwindcss.com"],
      fontSrc: ["'self'", "https:", "data:"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "https:", "wss:"],
      mediaSrc: ["'self'", "blob:", "data:"],
      objectSrc: ["'none'"]
    }
  }
}));

// CORS Configuration
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Native GZIP Compression Middleware
const zlib = require('zlib');
app.use((req, res, next) => {
  const acceptEncoding = req.headers['accept-encoding'] || '';
  if (!acceptEncoding.includes('gzip') || req.method === 'HEAD') return next();

  const originalWrite = res.write;
  const originalEnd = res.end;
  const chunks = [];

  res.write = function (chunk) {
    if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  };

  res.end = function (chunk) {
    if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    const body = Buffer.concat(chunks);

    if (body.length > 512 && res.statusCode === 200 && !res.getHeader('Content-Encoding')) {
      zlib.gzip(body, (err, compressed) => {
        if (err || !compressed) {
          if (body.length > 0) res.setHeader('Content-Length', body.length);
          originalWrite.call(res, body);
          return originalEnd.call(res);
        }
        res.setHeader('Content-Encoding', 'gzip');
        res.setHeader('Content-Length', compressed.length);
        originalWrite.call(res, compressed);
        originalEnd.call(res);
      });
    } else {
      if (body.length > 0) res.setHeader('Content-Length', body.length);
      originalWrite.call(res, body);
      originalEnd.call(res);
    }
  };

  next();
});

// Logging Middleware
app.use(morgan('dev'));

// General Rate Limiter
app.use('/api', generalLimiter);

// API Endpoint Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/admin/inventory', inventoryRoutes);
app.use('/api/admin', adminRoutes);

// Serve Client Web Application with Cache-Control headers
const clientPath = path.join(__dirname, '../../client');
app.use(express.static(clientPath, {
  maxAge: '1h',
  etag: true,
  setHeaders: (res, filepath) => {
    if (filepath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    } else if (filepath.endsWith('.js') || filepath.endsWith('.css') || filepath.endsWith('.png') || filepath.endsWith('.jpg')) {
      res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    }
  }
}));

// Fallback to index.html for client SPA routes
app.get('*', (req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(clientPath, 'index.html'));
});

// Centralized Error Handler
app.use(errorHandler);

module.exports = app;
