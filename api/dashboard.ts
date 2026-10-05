import { IncomingMessage, ServerResponse } from 'http';
import { processDashboardRequest, IncomingAuthRequest } from './_backend';

type VercelRequest = IncomingMessage & {
  query?: Record<string, unknown>;
  body?: Record<string, unknown> | string;
  headers: Record<string, string | string[] | undefined>;
};

type VercelResponse = ServerResponse & {
  status?: (code: number) => VercelResponse;
  json?: (data: unknown) => void;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authReq: IncomingAuthRequest = {
    method: req.method,
    query: req.query || {},
    body: {},
    headers: req.headers,
  };

  const result = processDashboardRequest(authReq);

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
