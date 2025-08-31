import { vi } from 'vitest'

export const httpClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  request: vi.fn(),
}

export class HttpClient {
  get = vi.fn()
  post = vi.fn()
  put = vi.fn()
  patch = vi.fn()
  delete = vi.fn()
  request = vi.fn()
}

export const setCurrentRestaurantId = vi.fn()
export const getCurrentRestaurantId = vi.fn()

export class APIError extends Error {
  status: number
  details?: any

  constructor(message: string, status: number, details?: any) {
    super(message)
    this.status = status
    this.details = details
  }
}