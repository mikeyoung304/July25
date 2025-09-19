import 'express'

declare global {
  namespace Express {
    interface User {
      id: string
      roles?: string[]
      restaurantId?: string
    }
    interface Request {
      user?: User
    }
  }
}

export {}
