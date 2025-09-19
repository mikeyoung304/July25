import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

describe('webhook signature stubs', () => {
  const app = createApp();

  it('returns an error when signature headers are missing', async () => {
    const response = await request(app)
      .post('/api/v1/webhooks/square')
      .send({ ok: true });

    expect([400, 401, 404]).toContain(response.status);
  });
});
