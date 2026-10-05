import express from 'express';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  processAuthRequest,
  processCategoriesRequest,
  processProductsRequest,
  processOrdersRequest,
  processUploadRequest,
  processDashboardRequest,
  IncomingAuthRequest,
  ApiHandlerResult,
} from './api/_backend';

const app = express();
const httpServer = http.createServer(app);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

function toIncomingAuthRequest(req: express.Request): IncomingAuthRequest {
  return {
    method: req.method,
    query: req.query as Record<string, unknown>,
    body: (req.body || {}) as Record<string, unknown>,
    headers: req.headers as Record<string, string | string[] | undefined>,
    protocol: req.protocol,
  };
}

function sendApiResult(res: express.Response, result: ApiHandlerResult): void {
  if (result.headers) {
    for (const [k, v] of Object.entries(result.headers)) {
      res.setHeader(k, v);
    }
  }
  res.status(result.status).json(result.body);
}

// ============================================================================
// 1. /api/auth & /api/auth.php
// ============================================================================
app.all(['/api/auth', '/api/auth.php'], (req, res) => {
  sendApiResult(res, processAuthRequest(toIncomingAuthRequest(req)));
});

// ============================================================================
// 2. /api/categories & /api/categories.php
// ============================================================================
app.all(['/api/categories', '/api/categories.php'], (req, res) => {
  sendApiResult(res, processCategoriesRequest(toIncomingAuthRequest(req)));
});

// ============================================================================
// 3. /api/products & /api/products.php
// ============================================================================
app.all(['/api/products', '/api/products.php'], (req, res) => {
  sendApiResult(res, processProductsRequest(toIncomingAuthRequest(req)));
});

// ============================================================================
// 4. /api/orders & /api/orders.php
// ============================================================================
app.all(['/api/orders', '/api/orders.php'], (req, res) => {
  sendApiResult(res, processOrdersRequest(toIncomingAuthRequest(req)));
});

// ============================================================================
// 4B. /api/upload & /api/upload.php
// ============================================================================
app.post(['/api/upload', '/api/upload.php'], (req, res) => {
  sendApiResult(res, processUploadRequest(toIncomingAuthRequest(req)));
});

// ============================================================================
// 5. /api/dashboard & /api/dashboard.php
// ============================================================================
app.get(['/api/dashboard', '/api/dashboard.php'], (req, res) => {
  sendApiResult(res, processDashboardRequest(toIncomingAuthRequest(req)));
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  // In the AI Studio preview environment, rewrite /admin/*.php to /admin so React Router renders the interactive Owner Admin Portal instead of serving raw .php files
  app.use((req, _res, next) => {
    if (req.path.startsWith('/admin/') && req.path.endsWith('.php')) {
      req.url =
        req.path.replace(/\.php$/, '') +
        (req.url.includes('?') ? '?' + req.url.split('?')[1] : '');
    }
    next();
  });

  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Malik G Collection Server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
