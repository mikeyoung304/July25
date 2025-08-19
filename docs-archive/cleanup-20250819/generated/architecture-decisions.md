# Architecture Decision Records

Architecture Decision Records (ADRs) document important architectural decisions made during the development of this project.

## What is an ADR?

An Architecture Decision Record (ADR) is a document that captures a decision, including the context of the decision and the consequences of adopting the decision.

## ADR Format

Each ADR should follow this format:

1. **Title**: Brief noun phrase
2. **Status**: Proposed, Accepted, Deprecated, or Superseded
3. **Context**: Forces at play, including technological, political, social, and project local
4. **Decision**: Response to forces
5. **Consequences**: Results after applying the decision

## Creating New ADRs

To create a new ADR:

1. Create a new file in `docs/adr/` with format `NNNN-title.md`
2. Use the template above
3. Update this index

## Current ADRs

### Foundational Decisions

- **0001-unified-backend-architecture**: Decision to use a single Express.js backend instead of microservices
- **0002-typescript-everywhere**: Decision to use TypeScript for both frontend and backend
- **0003-supabase-as-database**: Choice of Supabase for database and real-time features

### Development Decisions

- **0004-testing-strategy**: Comprehensive testing approach with Playwright and Jest
- **0005-code-quality-gates**: Pre-commit hooks and automated quality checks
- **0006-monitoring-observability**: Performance and error monitoring implementation

---

*To learn more about ADRs, see: [Documenting Architecture Decisions](http://thinkrelevance.com/blog/2011/11/15/documenting-architecture-decisions)*
