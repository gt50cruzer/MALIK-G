import fs from 'fs';
import path from 'path';
import type { IncomingMessage, ServerResponse } from 'http';
import { processUploadRequest, type IncomingAuthRequest } from './_backend.js';

type VercelRequest = IncomingMessage & {
  query?: Record<string, unknown>;
  body?: Record<string, unknown> | string;
  headers: Record<string, string | string[] | undefined>;
};

type VercelResponse = ServerResponse & {
  status?: (code: number) => VercelResponse;
  json?: (data: unknown) => void;
};

async function parseJsonBody(req: VercelRequest): Promise<Record<string, unknown>> {
  const method = (req.method || 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return {};
  }
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body as Record<string, unknown>;
  }
  if (Buffer.isBuffer(req.body)) {
    try {
      return JSON.parse(req.body.toString('utf-8')) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof req.body === 'string' && req.body.trim()) {
    try {
      return JSON.parse(req.body) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (req.readableEnded || req.complete) {
    return {};
  }
  return new Promise((resolve) => {
    let raw = '';
    const timer = setTimeout(() => resolve({}), 3000);
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      clearTimeout(timer);
      if (!raw || !raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw) as Record<string, unknown>);
      } catch {
        resolve({});
      }
    });
    req.on('error', () => {
      clearTimeout(timer);
      resolve({});
    });
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const method = (req.method || 'GET').toUpperCase();

  if (method === 'OPTIONS') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.statusCode = 200;
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // Serve uploaded image file when requested via GET /api/upload?file=mgc_prod_...
  if (method === 'GET') {
    const urlStr = req.url || '';
    const qIndex = urlStr.indexOf('?');
    const params = qIndex !== -1 ? new URLSearchParams(urlStr.slice(qIndex + 1)) : null;
    const rawFile = String(req.query?.file || params?.get('file') || '').trim();
    const safeName = path.basename(rawFile);
    if (safeName && /^mgc_prod_[A-Za-z0-9_]+\.(jpg|jpeg|png|webp)$/i.test(safeName)) {
      const tmpPath = path.join('/tmp', 'malik_g_uploads', safeName);
      const pubPath = path.resolve(process.cwd(), 'public', 'uploads', safeName);
      const target = fs.existsSync(tmpPath) ? tmpPath : fs.existsSync(pubPath) ? pubPath : '';
      if (target) {
        const ext = path.extname(safeName).toLowerCase();
        const mime =
          ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
        res.setHeader('Content-Type', mime);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.statusCode = 200;
        res.end(fs.readFileSync(target));
        return;
      }
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.statusCode = 404;
    res.end(JSON.stringify({ success: false, error: 'Image not found.' }));
    return;
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  try {
    const body = await parseJsonBody(req);

    const authReq: IncomingAuthRequest = {
      method: req.method,
      query: req.query || {},
      body,
      headers: req.headers,
    };

    const result = processUploadRequest(authReq);

    if (result.headers) {
      for (const [k, v] of Object.entries(result.headers)) {
        res.setHeader(k, v);
      }
    }

    res.statusCode = result.status;
    res.end(JSON.stringify(result.body));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error.';
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, message, error: message }));
  }
}
