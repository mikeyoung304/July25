# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [6.0.8-rc.1] - 2025-10-15

### Added
- Docs refresh: truth-first README, SECURITY, DEPLOYMENT, DATABASE, TROUBLESHOOTING, VERSION, index.
- Docs CI: docs:check script and GitHub workflow.

### Changed
- Deployment instructions: strict CORS allowlist, WS auth required in production.
- Database reference: RLS policies for orders/scheduled_orders; per-restaurant PIN model; indexes.

### Fixed
- Historical inaccuracies around demo credentials and WS auth.
- References to KDS spinner/race issues updated with current guards.

### Security
- Single JWT secret (fail-fast; no fallback).
- PII redaction in server logs documented.
