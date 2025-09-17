import { Request, Response, NextFunction } from 'express';
import { requireRestaurantId, requireRestaurantIdStrict } from '../requireRestaurantId';
import { BadRequest } from '../errorHandler';

describe('requireRestaurantId middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      headers: {},
      query: {},
      body: {},
      method: 'POST',
      path: '/test'
    };
    res = {};
    next = jest.fn();
  });

  describe('requireRestaurantId', () => {
    it('should accept restaurant ID from header', () => {
      req.headers = { 'x-restaurant-id': '11111111-1111-4111-1111-111111111111' };

      requireRestaurantId(req as Request, res as Response, next);

      expect((req as any).restaurantId).toBe('11111111-1111-4111-1111-111111111111');
      expect(next).toHaveBeenCalledWith();
    });

    it('should accept restaurant ID from query', () => {
      req.query = { restaurantId: '22222222-2222-4222-2222-222222222222' };

      requireRestaurantId(req as Request, res as Response, next);

      expect((req as any).restaurantId).toBe('22222222-2222-4222-2222-222222222222');
      expect(next).toHaveBeenCalledWith();
    });

    it('should accept restaurant ID from body', () => {
      req.body = { restaurantId: '33333333-3333-4333-3333-333333333333' };

      requireRestaurantId(req as Request, res as Response, next);

      expect((req as any).restaurantId).toBe('33333333-3333-4333-3333-333333333333');
      expect(next).toHaveBeenCalledWith();
    });

    it('should prioritize header over query and body', () => {
      req.headers = { 'x-restaurant-id': '11111111-1111-4111-1111-111111111111' };
      req.query = { restaurantId: '22222222-2222-4222-2222-222222222222' };
      req.body = { restaurantId: '33333333-3333-4333-3333-333333333333' };

      requireRestaurantId(req as Request, res as Response, next);

      expect((req as any).restaurantId).toBe('11111111-1111-4111-1111-111111111111');
    });

    it('should reject invalid UUID format', () => {
      req.headers = { 'x-restaurant-id': 'invalid-uuid' };

      requireRestaurantId(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'INVALID_RESTAURANT_ID'
        })
      );
    });

    it('should reject missing restaurant ID', () => {
      requireRestaurantId(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'RESTAURANT_ID_REQUIRED'
        })
      );
    });
  });

  describe('requireRestaurantIdStrict', () => {
    it('should only accept restaurant ID from header', () => {
      req.headers = { 'x-restaurant-id': '11111111-1111-4111-1111-111111111111' };

      requireRestaurantIdStrict(req as Request, res as Response, next);

      expect((req as any).restaurantId).toBe('11111111-1111-4111-1111-111111111111');
      expect(next).toHaveBeenCalledWith();
    });

    it('should reject restaurant ID from query', () => {
      req.query = { restaurantId: '22222222-2222-4222-2222-222222222222' };

      requireRestaurantIdStrict(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'RESTAURANT_HEADER_REQUIRED'
        })
      );
    });

    it('should reject restaurant ID from body', () => {
      req.body = { restaurantId: '33333333-3333-4333-3333-333333333333' };

      requireRestaurantIdStrict(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'RESTAURANT_HEADER_REQUIRED'
        })
      );
    });

    it('should reject invalid UUID in header', () => {
      req.headers = { 'x-restaurant-id': 'not-a-valid-uuid' };

      requireRestaurantIdStrict(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'INVALID_RESTAURANT_ID'
        })
      );
    });
  });
});