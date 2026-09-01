# GraphQL QA Automation Framework

A production-style GraphQL quality framework for schema contracts, execution semantics, authorization, pagination, abstract types, operation governance, persisted-operation identity, HTTP transport behavior, and deterministic CI evidence.

## Quality model

The repository tests GraphQL at multiple layers instead of treating every check as an end-to-end request:

- **Schema contracts** validate the canonical SDL, interfaces, unions, introspection, and deterministic schema fingerprints.
- **Execution contracts** exercise variables, nullability, authorization, cursors, abstract-type resolution, and mutations against an in-memory deterministic service.
- **Operation governance** measures query depth and selection count and binds committed named operations to SHA-256 identities.
- **Transport contracts** distinguish network, HTTP, malformed-protocol, and GraphQL execution failures.
- **Live smoke** is explicit opt-in evidence against an externally supplied endpoint; it is not represented as deterministic pull-request coverage.

## Toolchain

- Node.js 24.20.0 (current qualification runtime)
- Node.js 22 compatibility lane
- npm 11.19.1
- GraphQL.js 17.0.2
- TypeScript 7.0.2
- Vitest 4.1.11 with V8 coverage

## Local qualification

```bash
npm ci
npm run quality
```

To execute the explicit live smoke boundary:

```bash
cp .env.example .env
# export the required values through your shell or secret manager
RUN_LIVE_GRAPHQL=true npm run test:live
```

## CI conclusions

`CI / ci-gate`, `docs / docs-contract`, and `security / security-gate` are stable aggregate workflow conclusions. The CI gate includes type checking, unit/contract/integration execution, coverage evidence, schema validation, operation-manifest validation, and a Node 22 compatibility lane.

Security qualification combines immutable workflow dependency validation, CodeQL, npm Audit, Trivy, and conditional GitHub Dependency Review with an explicit non-equivalent repository-wide fallback when Dependency Graph is unavailable.

## Repository map

Only directories are listed here intentionally.

```text
.github/
docs/
operations/
schema/
scripts/
src/
tests/
```

## Design references

See `docs/architecture.md`, `docs/graphql-testing.md`, `docs/security-and-limits.md`, `docs/schema-evolution.md`, `docs/live-endpoint.md`, and `docs/ci-quality-gates.md`.
