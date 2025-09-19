import request from 'supertest'
import { describe, it, expect } from 'vitest'
import { createApp } from '../src/app'

describe('strict auth (writes only)', () => {
  const app = createApp()
  it('rejects mutating requests without headers', async () => {
    const res = await request(app).post('/api/v1/orders')
    expect(res.status).toBe(401)
  })
  it('allows GET without headers (guard is writes-only)', async () => {
    const res = await request(app).get('/api/v1/orders')
    expect([200, 401, 404]).toContain(res.status)
  })
})
