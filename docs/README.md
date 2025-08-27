# Restaurant OS Documentation

## Quick Links

- [Getting Started](./01-getting-started/installation.md) - 5 minute setup
- [Architecture Overview](./02-architecture/overview.md) - System design
- [API Reference](./04-api/rest/README.md) - Endpoint documentation
- [Developer Guide](./06-development/setup.md) - Development workflow

## Project Overview

Restaurant OS is a comprehensive Point of Sale and management system for restaurants, featuring:

- **Multi-tenant** architecture supporting multiple restaurant locations
- **Real-time** order management with WebSocket updates
- **AI-powered** voice ordering using OpenAI Realtime API
- **Kitchen Display System** (KDS) with real-time order tracking
- **Payment Integration** with Square Terminal support
- **Analytics Dashboard** for business insights

## Documentation Structure

```
docs/
├── 01-getting-started/    # Quick setup and configuration
├── 02-architecture/       # System design and decisions
├── 03-features/          # Feature documentation
├── 04-api/              # API reference (auto-generated)
├── 05-operations/       # Deployment and monitoring
└── 06-development/      # Development guidelines
```

## Tech Stack

- **Frontend**: React 19.1.0, TypeScript 5.8.3, Vite 5.4.19
- **Backend**: Express 4.18.2, Node.js, TypeScript 5.3.3
- **Database**: Supabase (PostgreSQL)
- **Real-time**: WebSockets, OpenAI Realtime API
- **Payments**: Square SDK

## Getting Help

- Check [Troubleshooting Guide](./05-operations/troubleshooting.md)
- Review [Known Issues](./06-development/known-issues.md)
- See [CLAUDE.md](/CLAUDE.md) for AI assistant guidelines

## Version

Current Version: 6.0.0

Last Updated: January 2025