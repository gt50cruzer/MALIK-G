import type { IncomingMessage, ServerResponse } from 'http';
import { processCategoriesRequest, type IncomingAuthRequest } from './_backend.js';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if ((req.method || '').toUpperCase() === 'OPTIONS') {
    res.statusCode = 200;
    res.end(JSON.stringify({ success: true }));
    return;
  }

  try {
    const body = await parseJsonBody(req);
    const query = parseQuery(req);

    const authReq: IncomingAuthRequest = {
      method: req.method,
      query,
      body,
      headers: req.headers,
    };

    const result = processCategoriesRequest(authReq);

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
