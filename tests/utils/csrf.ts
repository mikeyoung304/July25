import request from 'supertest'
import type { Express } from 'express'

export async function getCsrfPair(app: Express) {
  const res = await request(app).get('/csrf').expect(200)
  const setCookie = res.headers['set-cookie'] || []
  const csrfCookie = setCookie.find((c: string) => /^csrf=/.test(c))
  const token =
    res.body?.csrfToken ||
    res.text?.match(/name="csrfToken" value="([^"]+)"/)?.[1]
  if (!csrfCookie || !token) throw new Error('CSRF pair not found')
  return { csrfCookie, token }
}