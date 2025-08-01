# API Reference

Base URL: `http://localhost:3001/api/v1`

## Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /orders | List orders (query: status, type, date) |
| GET | /orders/:id | Get order details |
| POST | /orders | Create order |
| PATCH | /orders/:id | Update order status |
| DELETE | /orders/:id | Cancel order |

## Menu

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /menu/items | List menu items |
| GET | /menu/categories | List categories |
| POST | /menu/items | Add menu item |
| PUT | /menu/items/:id | Update item |
| DELETE | /menu/items/:id | Remove item |

## AI/Voice

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /ai/transcribe | Convert audio to text |
| POST | /ai/parse-order | Parse text to order |
| POST | /ai/upload-menu | Upload menu for AI |

## Monitoring

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Basic health check |
| GET | /health/detailed | System status |
| POST | /metrics | Submit performance metrics |

## WebSocket

Connect: `ws://localhost:3001`

Events:
- `order:created`
- `order:updated`
- `order:completed`
- `connection:ping`