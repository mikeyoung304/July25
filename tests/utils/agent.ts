import request from 'supertest'
import type { Express } from 'express'

export function agent(app: Express) {
  return request.agent(app) // persists cookies across requests
}