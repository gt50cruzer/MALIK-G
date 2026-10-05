import { IncomingMessage, ServerResponse } from 'http';
import { processCategoriesRequest, IncomingAuthRequest } from './_backend';

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
  const body = await parseJsonBody(req);
  const query = parseQuery(req);

  const authReq: IncomingAuthRequest = {
    method: req.method,
    query,
    body,
    headers: req.headers,
  };

  const result = processCategoriesRequest(authReq);

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (result.headers) {
    for (const [k, v] of Object.entries(result.headers)) {
      res.setHeader(k, v);
    }
  }

  if (typeof res.status === 'function' && typeof res.json === 'function') {
    res.status(result.status).json(result.body);
    return;
  }

  res.statusCode = result.status;
  res.end(JSON.stringify(result.body));
}
