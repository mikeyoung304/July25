# Explanation

**Last Updated:** 2025-11-08

**Understanding-oriented documentation that clarifies and deepens knowledge.**

Explanations help you understand the reasoning, design decisions, and concepts behind Restaurant OS. They provide context and illuminate the "why" behind technical choices.

## Architecture

High-level system design and architectural patterns:

- [Architecture Overview](./architecture/ARCHITECTURE.md) - System design and voice ordering architecture
- [Authentication Architecture](./architecture/AUTHENTICATION_ARCHITECTURE.md) - Auth flows, session management, and security

### Architecture Diagrams

Visual representations of system architecture:

- [C4 Context Diagram](./architecture/diagrams/c4-context.md) - System context and external interactions
- [C4 Container Diagram](./architecture/diagrams/c4-container.md) - High-level technical building blocks
- [Authentication Flow](./architecture/diagrams/auth-flow.md) - Authentication sequence diagrams
- [Payment Flow](./architecture/diagrams/payment-flow.md) - Payment processing flows
- [Voice Ordering](./architecture/diagrams/voice-ordering.md) - Voice ordering architecture

## Architecture Decision Records (ADRs)

Documents that capture important architectural decisions and their rationale:

- [ADR-001: Snake Case Convention](./architecture-decisions/ADR-001-snake-case-convention.md)
- [ADR-002: Multi-Tenancy Architecture](./architecture-decisions/ADR-002-multi-tenancy-architecture.md)
- [ADR-003: Embedded Orders Pattern](./architecture-decisions/ADR-003-embedded-orders-pattern.md)
- [ADR-004: WebSocket Realtime Architecture](./architecture-decisions/ADR-004-websocket-realtime-architecture.md)
- [ADR-005: Client-Side Voice Ordering](./architecture-decisions/ADR-005-client-side-voice-ordering.md)
- [ADR-006: Dual Authentication Pattern](./architecture-decisions/ADR-006-dual-authentication-pattern.md)
- [ADR-007: Per-Restaurant Configuration](./architecture-decisions/ADR-007-per-restaurant-configuration.md)
- [ADR-008: Slug-Based Routing](./architecture-decisions/ADR-008-slug-based-routing.md)
- [ADR-009: Error Handling Philosophy](./architecture-decisions/ADR-009-error-handling-philosophy.md)
- [ADR-010: Remote Database as Single Source of Truth](./architecture-decisions/ADR-010-remote-database-source-of-truth.md)

## Concepts

Core concepts and domain knowledge:

- [Menu System](./concepts/MENU_SYSTEM.md) - How the menu system works
- [Order Flow](./concepts/ORDER_FLOW.md) - Order lifecycle and state management
- [Stripe Integration](./concepts/STRIPE_INTEGRATION.md) - Payment processing concepts
- [Migration V6 Auth](./concepts/MIGRATION_V6_AUTH.md) - Authentication migration explained

## What is Explanation Documentation?

Explanation documentation is designed to deepen your understanding. It:

- **Clarifies concepts** - Helps you understand complex topics
- **Provides context** - Explains the "why" behind decisions
- **Connects ideas** - Shows how different parts relate
- **Discusses alternatives** - Explores trade-offs and options

## Need Something Else?

- **Want to learn by doing?** - Try [Tutorials](../tutorials/)
- **Need to accomplish a task?** - Check [How-To Guides](../how-to/)
- **Looking up details?** - See [Reference](../reference/)

---

**Part of the [Diátaxis Framework](https://diataxis.fr/)** - A systematic approach to technical documentation
