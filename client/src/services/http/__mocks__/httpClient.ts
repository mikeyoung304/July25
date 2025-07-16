export const httpClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  request: jest.fn(),
}

export class HttpClient {
  get = jest.fn()
  post = jest.fn()
  put = jest.fn()
  patch = jest.fn()
  delete = jest.fn()
  request = jest.fn()
}

export const setCurrentRestaurantId = jest.fn()
export const getCurrentRestaurantId = jest.fn()

export class APIError extends Error {
  status: number
  details?: any

  constructor(message: string, status: number, details?: any) {
    super(message)
    this.status = status
    this.details = details
  }
}