import { IncomingMessage, ServerResponse } from 'http';
import { processUploadRequest, IncomingAuthRequest } from './_backend';

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
  if (req.body && typeof req.body === 'object') {
    return req.body as Record<string, unknown>;
  }
  if (typeof req.body === 'string' && req.body.trim()) {
    try {
      return JSON.parse(req.body) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
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
    req.on('error', () => resolve({}));
  });
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
