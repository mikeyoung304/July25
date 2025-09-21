import request from 'supertest';
import type { Express } from 'express';

export interface CsrfPair {
  csrfCookie: string;
  token: string;
}

/**
 * Helper to get a valid CSRF token pair from the test app
 */
export async function getCsrfPair(app: Express): Promise<CsrfPair> {
  const res = await request(app).get('/api/csrf-token');

  const setCookie = res.headers['set-cookie'] || [];
  const csrfCookie = Array.isArray(setCookie)
    ? setCookie.find((c: string) => /^csrf=/.test(c))
    : setCookie;

  const token = res.body?.token || res.text?.match(/name="csrfToken" value="([^"]+)"/)?.[1];

  if (!csrfCookie || !token) {
    throw new Error('CSRF pair not found in response');
  }

  return { csrfCookie, token };
}

/**
 * Helper to make a request with CSRF protection
 */
export async function requestWithCsrf(
  app: Express,
  method: 'post' | 'put' | 'delete' | 'patch',
  path: string,
  data?: any
) {
  const { csrfCookie, token } = await getCsrfPair(app);

  const req = request(app)[method](path)
    .set('Cookie', csrfCookie)
    .set('x-csrf-token', token);

  if (data) {
    req.send(data);
  }

  return req;
}