import type { IncomingMessage, ServerResponse } from 'http';
import type { IncomingAuthRequest } from './_backend.js';

type VercelRequest = IncomingMessage & {
  query?: Record<string, unknown>;
  body?: Record<string, unknown> | string;
  headers: Record<string, string | string[] | undefined>;
};

type VercelResponse = ServerResponse & {
  status?: (code: number) => VercelResponse;
  json?: (data: unknown) => void;
};

function parseQuery(req: VercelRequest): Record<string, unknown> {
  if (req.query && typeof req.query === 'object' && Object.keys(req.query).length > 0) {
    return req.query;
  }
  const urlStr = req.url || '';
  const qIndex = urlStr.indexOf('?');
  if (qIndex === -1) return {};
  const params = new URLSearchParams(urlStr.slice(qIndex + 1));
  const out: Record<string, unknown> = {};
  params.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

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
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Session-Token, X-Customer-Vault, X-CSRF-Token'
  );

  const method = (req.method || 'GET').toUpperCase();

  if (method === 'OPTIONS') {
    res.statusCode = 200;
    res.end(JSON.stringify({ success: true }));
    return;
  }

  const query = parseQuery(req);
  const action = String(query.action || '').trim();

  // Immediate zero-dependency health response before loading any backend/database logic
  if (method === 'GET' && action === 'health') {
    res.statusCode = 200;
    res.end(
      JSON.stringify({
        success: true,
        service: 'auth',
        runtime: 'vercel',
      })
    );
    return;
  }

  try {
    const { processAuthRequest } = await import('./_backend.js');
    const body = await parseJsonBody(req);

    const authReq: IncomingAuthRequest = {
      method,
      query,
      body,
      headers: req.headers || {},
    };

    const result = processAuthRequest(authReq);

    if (result.headers) {
      for (const [k, v] of Object.entries(result.headers)) {
        res.setHeader(k, v);
      }
    }

    res.statusCode = result.status;
    res.end(JSON.stringify(result.body));
  } catch (err) {
    console.error('[Vercel /api/auth error]:', err);
    res.statusCode = 500;
    res.end(
      JSON.stringify({
        success: false,
        message: 'Authentication server error.',
        error: 'Authentication server error.',
      })
    );
  }
}
