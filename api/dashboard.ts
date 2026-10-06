import type { IncomingMessage, ServerResponse } from 'http';
import { processDashboardRequest, type IncomingAuthRequest } from './_backend.js';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if ((req.method || '').toUpperCase() === 'OPTIONS') {
    res.statusCode = 200;
    res.end(JSON.stringify({ success: true }));
    return;
  }

  try {
    const authReq: IncomingAuthRequest = {
      method: req.method,
      query: parseQuery(req),
      body: {},
      headers: req.headers,
    };

    const result = processDashboardRequest(authReq);

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
