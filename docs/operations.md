# Operations Guide

## Purpose

This guide owns day-to-day qualification and operating guidance for the GraphQL quality framework: local commands, schema and operation identity checks, deterministic versus live execution, evidence interpretation, dependency maintenance, and failure triage.

Use the focused guides for domain depth:

- [`graphql-testing.md`](graphql-testing.md) — execution semantics, persisted operations, transport testing, and GraphQL-specific assertions.
- [`security-and-limits.md`](security-and-limits.md) — operation limits, authorization and safety boundaries.
- [`schema-evolution.md`](schema-evolution.md) — schema fingerprinting and change review.
- [`live-endpoint.md`](live-endpoint.md) — explicit external endpoint execution.
- [`ci-quality-gates.md`](ci-quality-gates.md) — evidence validators and workflow conclusions.

## Local qualification

Install the exact dependency graph and run the same deterministic quality surface used by primary CI:

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run quality
```

Focused commands:

| Command | Purpose |
| --- | --- |
| `npm run typecheck` | Strict TypeScript contract |
| `npm run test:unit` | Unit + contract execution |
| `npm run test:integration` | Loopback HTTP integration |
| `npm run test:coverage` | Governed deterministic suite + V8 evidence |
| `npm run schema:check` | Regenerate and compare canonical schema SHA-256 |
| `npm run manifest:check` | Regenerate and compare persisted-operation identities |
| `npm run docs:check` | README/docs structural contract |
| `npm run workflow-pins:check` | Immutable external Action contract |
| `npm run repo:check` | Repository structure/policy contract |

The governed deterministic suite contains **23 tests** across unit, contract, and integration layers. CI validates execution identity/count and coverage evidence after Vitest exits so discovery loss cannot masquerade as a green result.

## Schema identity lifecycle

The committed SDL is the schema source of truth. `schema:check` builds the framework, loads the root-relative schema, generates the current fingerprint, and compares it with the committed baseline.

```bash
npm run schema:check
```

For an intentional schema change:

```bash
npm run schema:refresh
npm run schema:check
```

A matching SHA-256 proves the schema did not change. A changed SHA-256 proves only that it changed; compatibility, deprecation, resolver impact and rollout safety still require GraphQL-aware review.

## Persisted-operation lifecycle

Named operations in `operations/` are normalized into a committed manifest with exact SHA-256 document identities.

```bash
npm run manifest:check
```

For an intentional operation change:

```bash
npm run manifest:refresh
npm run manifest:check
```

The manifest prevents syntactically valid document replacement or drift from being accepted silently. Identity alone does not prove authorization, cache behavior or server-side persisted-query rollout.

## Operation policy

Depth and selection-count policy are evaluated from the parsed GraphQL AST before execution. This keeps complexity governance deterministic and fail-fast rather than relying on timing as a proxy for query cost.

Static policy and runtime semantics are different signals. An admissible operation can still be unauthorized or return incorrect resolver data; an invalid operation should be rejected before consuming execution capacity.

## Transport boundary

The client separates failure domains that generic HTTP wrappers often collapse:

- network/connectivity failure;
- non-success HTTP status;
- malformed/non-GraphQL response shape;
- successful HTTP transport carrying GraphQL `errors`;
- successful GraphQL data response.

Integration tests use the repository-owned loopback HTTP server so serialization, headers, status and GraphQL protocol behavior remain real without public-network variability. Diagnostics redact secret-bearing transport details.

## Live endpoint boundary

External execution is explicit opt-in evidence and is never required for deterministic pull-request health.

```bash
cp .env.example .env
# export required values through the shell or a secret manager
RUN_LIVE_GRAPHQL=true npm run test:live
```

The manual live-smoke workflow exists so endpoint ownership, authentication, authorization, mutation policy, rate limits, tenancy and data handling can be supplied intentionally. A successful minimal live probe is intentionally narrower than full schema/resolver/environment qualification.

## Evidence and CI

The stable repository-facing conclusions are:

- `CI / ci-gate` — repository policy, types, deterministic tests, coverage evidence, schema identity, operation identity, and Node compatibility;
- `docs / docs-contract` — README/docs/workflow badge/Mermaid/repository-map contract;
- `Security / security-gate` — supply-chain policy, CodeQL, npm Audit, Trivy, and pull-request Dependency Review when available.

Evidence validation is semantic rather than file-presence based. JUnit identity/count and coverage floors must agree with the intended governed suite.

When GitHub Dependency graph is unavailable, npm Audit and Trivy remain active repository-wide controls; they are not represented as equivalent to change-aware Dependency Review.

## Confidence boundaries

| Signal | Confidence gained | Deliberate limit |
| --- | --- | --- |
| Schema fingerprint | Canonical SDL identity is unchanged or intentionally changed | Does not judge compatibility or resolver correctness |
| Operation manifest | Governed operation text maps to an exact identity | Does not prove server persisted-query rollout or authorization |
| Static operation policy | Parsed documents satisfy depth/selection governance | Does not prove runtime caller authorization or data correctness |
| Deterministic execution | Variables, nullability, resolvers, mutations, pagination and abstract types execute against controlled data | Does not prove deployed transport/infrastructure |
| Loopback HTTP integration | Serialization, headers, HTTP status and GraphQL error classification are executable | Does not prove production ingress, TLS or remote availability |
| Manual live smoke | Explicit endpoint/auth boundary accepts the narrow governed probe | Not full schema, mutation, performance or dependency health |
| JUnit/coverage/schema/manifest evidence | Governed checks actually executed with expected attribution | Artifact existence alone is insufficient |
| CodeQL/npm Audit/Trivy/Dependency Review | Independent source/dependency/repository/change-diff security planes are inspected | Green scanners are scoped evidence, not proof of vulnerability absence |

## Dependency maintenance

Dependabot maintains npm and GitHub Actions updates. Automated proposals must clear the same repository, runtime, deterministic GraphQL, schema/manifest, evidence and security contracts as human-authored changes.

The package engine range deliberately qualifies supported Node lines rather than silently accepting future majors. Runtime expansion is a support decision, not an incidental dependency update.

## Failure triage

| Signal | First interpretation |
| --- | --- |
| Schema fingerprint mismatch | Canonical SDL changed without an intentionally refreshed/reviewed baseline |
| Manifest mismatch | Governed operation identity drift |
| Operation policy failure | Depth/selection budget exceeded before execution |
| Resolver/execution failure | Nullability, authorization, mutation, pagination or abstract-type semantic contract |
| Transport failure | Network, HTTP, response-shape or GraphQL error-classification boundary |
| JUnit evidence failure | Intended governed tests were not proven to execute exactly as expected |
| Coverage evidence failure | Instrumented framework surface/evidence fell below governed policy |
| Additional-Node-only failure | Runtime compatibility drift isolated from the primary qualification line |
| Live-smoke failure | External endpoint/configuration/service boundary first |
| npm Audit / Trivy / CodeQL | Independent dependency/repository/source security plane |

## Operating principle

Use the **lowest boundary that can disprove the requirement**. Schema, AST, execution and loopback transport contracts should remain deterministic; add a live endpoint only when the requirement genuinely depends on deployed environment semantics.
