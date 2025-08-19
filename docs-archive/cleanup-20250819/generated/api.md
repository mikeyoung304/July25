# API Documentation

API for the Restaurant Operating System

**Version:** 1.0.0

## Servers

- **Development server:** http://localhost:3001
- **Production server:** https://july25.onrender.com

## Endpoints

### /api/v1/health

#### GET /api/v1/health

Health check endpoint

**Responses:**

- **200**: Service is healthy

### /api/v1/restaurants/{restaurantId}/menu

#### GET /api/v1/restaurants/{restaurantId}/menu

Get restaurant menu

**Parameters:**

- **restaurantId** (path): string *required*

**Responses:**

- **200**: Menu items

### /api/v1/orders

#### POST /api/v1/orders

Create new order

**Responses:**

- **201**: Order created successfully

