# GraphQL Quality Engineering Framework

[![CI](https://github.com/portyu9/qa-automation-graphql/actions/workflows/ci.yml/badge.svg)](https://github.com/portyu9/qa-automation-graphql/actions/workflows/ci.yml)
[![Security](https://github.com/portyu9/qa-automation-graphql/actions/workflows/security.yml/badge.svg)](https://github.com/portyu9/qa-automation-graphql/actions/workflows/security.yml)
[![Docs](https://github.com/portyu9/qa-automation-graphql/actions/workflows/docs.yml/badge.svg)](https://github.com/portyu9/qa-automation-graphql/actions/workflows/docs.yml)

[![GraphQL.js](https://img.shields.io/badge/GraphQL.js-graphql-E10098?logo=graphql&logoColor=white)](https://www.graphql-js.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-language-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vitest](https://img.shields.io/badge/Vitest-testing-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-runtime-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Schema SHA--256](https://img.shields.io/badge/Schema-SHA--256-6A5ACD)](docs/schema-evolution.md)
[![Persisted Operations](https://img.shields.io/badge/Persisted%20Operations-governed-C2410C)](docs/graphql-testing.md)
[![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-CI-2088FF?logo=githubactions&logoColor=white)](https://github.com/features/actions)
[![Trivy](https://img.shields.io/badge/Trivy-security-1904DA?logo=trivy&logoColor=white)](https://trivy.dev/)
[![License](https://img.shields.io/badge/License-MIT-2EA44F?logo=opensourceinitiative&logoColor=white)](LICENSE)
[![Security Policy](https://img.shields.io/badge/Security-Policy-24292F?logo=github&logoColor=white)](SECURITY.md)

A TypeScript GraphQL quality-engineering framework for **schema identity, execution semantics, authorization, pagination, operation policy, persisted-operation identity, HTTP transport classification, and deterministic evidence**. It uses the lowest layer that can conclusively prove each requirement instead of turning every contract into a network request.

> [!IMPORTANT]
> Schema validity, resolver correctness, static operation policy, HTTP success, GraphQL success, and persisted-operation identity are different signals. The framework keeps them separately attributable.

**Start here:** [quality model](#quality-model) · [architecture](#architecture) · [toolchain](#toolchain) · [schema governance](#schema-governance) · [operation governance](#operation-governance) · [CI conclusions](#ci-conclusions) · [documentation](#documentation)

## Quality model

| Plane | Primary boundary | What it proves |
| --- | --- | --- |
| Schema contracts | GraphQL.js + canonical SDL | Type-system shape and committed schema identity |
| Execution semantics | In-memory service | Variables, nullability, resolvers, mutations, auth, pagination, abstract types |
| Operation policy | Parsed AST | Depth and selection-count limits before execution |
| Persisted operations | Manifest generation/check | Named documents remain bound to exact SHA-256 identities |
| HTTP transport | Loopback GraphQL server | Serialization, HTTP/protocol/GraphQL failure classification |
| Evidence | Vitest JUnit + V8 validators | Governed tests and coverage actually executed |
| Runtime compatibility | Primary + additional Node lanes | Explicit supported-runtime qualification |
| Security | CodeQL + npm Audit + Trivy + Dependency Review | Independent source/dependency/repository/change-diff signals |
| Live endpoint | Manual opt-in | Narrow externally configured transport/auth boundary |

## Architecture

```mermaid
flowchart LR
    CHANGE[Schema · operation · framework change] --> SDL[Canonical SDL]
    CHANGE --> OPS[Governed operations]
    CHANGE --> CODE[TypeScript framework]

    SDL --> SCHEMA[Executable schema]
    OPS --> POLICY[AST policy]
    POLICY --> EXEC[GraphQL execution]
    SCHEMA --> EXEC

    CODE --> CLIENT[Transport client]
    EXEC --> LOOP[Loopback HTTP boundary]
    CLIENT --> LOOP

    SDL --> SF[Schema SHA-256]
    OPS --> MF[Operation manifest]
    EXEC --> TEST[Deterministic tests]
    CLIENT --> TEST
    SF --> EV[Governed evidence]
    MF --> EV
    TEST --> EV
    EV --> CIG[CI / ci-gate]

    CLIENT --> LIVE[Manual live smoke]
    CHANGE --> DOCS[Docs contracts]
    DOCS --> DG[docs / docs-contract]
    SEC[Security controls] --> SG[Security / security-gate]

    CIG --> RESULT[Qualified change]
    DG --> RESULT
    SG --> RESULT

    classDef entry fill:#DDF4FF,stroke:#0969DA,color:#24292F,stroke-width:1.5px;
    classDef contract fill:#FBEFFF,stroke:#8250DF,color:#24292F,stroke-width:1.5px;
    classDef runtime fill:#FFF8C5,stroke:#9A6700,color:#24292F,stroke-width:1.5px;
    classDef evidence fill:#DAFBE1,stroke:#1A7F37,color:#24292F,stroke-width:1.5px;
    classDef gate fill:#FFEBE9,stroke:#CF222E,color:#24292F,stroke-width:1.5px;
    class CHANGE entry;
    class SDL,OPS,POLICY,SF,MF,DOCS contract;
    class SCHEMA,EXEC,CODE,CLIENT,LOOP,LIVE runtime;
    class TEST,EV,RESULT evidence;
    class CIG,DG,SEC,SG gate;
    linkStyle default stroke:#57606A,stroke-width:1.4px;
```

The root README retains only this architecture overview. Detailed ownership, execution/transport separation and the deeper color-coded contract flow are in [`docs/architecture.md`](docs/architecture.md).

## Engineering invariants

- **Canonical sources:** committed SDL and governed operation documents are explicit sources of truth.
- **Identity:** schema and persisted-operation SHA-256 contracts regenerate and compare fail-closed.
- **Policy before execution:** depth/selection limits are AST contracts, not timing heuristics.
- **Layered semantics:** resolver/nullability/auth/pagination behavior is proven independently from HTTP transport.
- **Transport attribution:** network, HTTP, malformed protocol and GraphQL execution errors remain distinct.
- **Determinism:** required CI uses in-memory/loopback execution, not public GraphQL services.
- **Live separation:** external smoke is explicit/manual and never substitutes for deterministic qualification.
- **Evidence semantics:** JUnit identities/counts and V8 coverage are validated after execution.
- **Supply chain:** workflow policy, CodeQL, npm Audit, Trivy and Dependency Review remain separate controls.

## Toolchain

| Component | Qualified version / policy |
| --- | --- |
| Node.js | 24.20.0 primary; additional Node compatibility lane |
| npm | 11.19.1 |
| GraphQL.js | 17.0.2 |
| TypeScript | 7.0.2 with strict contracts including `exactOptionalPropertyTypes` |
| Vitest | 5.0.0 |
| Coverage | V8 through `@vitest/coverage-v8` 5.0.0 |

The Node engine range is deliberately bounded to qualified lines rather than silently accepting an untested future major.

## Quick start

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run quality
```

Useful focused commands and evidence interpretation are in [`docs/operations.md`](docs/operations.md).

## Schema governance

The committed SDL has a generated SHA-256 identity checked in CI:

```bash
npm run schema:check
```

Intentional changes use `npm run schema:refresh` followed by `npm run schema:check`. Fingerprint drift proves the schema changed; compatibility and rollout safety still require semantic review. See [`docs/schema-evolution.md`](docs/schema-evolution.md).

## Operation governance

Named operations are bound to a committed manifest with exact SHA-256 identities, while depth and selection-count limits are evaluated from the parsed AST before execution.

```bash
npm run manifest:check
```

Intentional document changes use `npm run manifest:refresh` followed by `npm run manifest:check`. See [`docs/graphql-testing.md`](docs/graphql-testing.md) and [`docs/security-and-limits.md`](docs/security-and-limits.md).

## Transport contracts

The client distinguishes network failure, non-success HTTP, malformed GraphQL protocol, HTTP success with GraphQL `errors`, and successful data responses. Integration coverage uses the repository-owned loopback server so HTTP semantics are real without public-network variability.

Detailed transport and live-target operating guidance lives in [`docs/operations.md`](docs/operations.md) and [`docs/live-endpoint.md`](docs/live-endpoint.md).

## CI conclusions

The stable repository-facing conclusions are **`CI / ci-gate`**, **`docs / docs-contract`**, and **`Security / security-gate`**.

- `ci.yml` qualifies repository/runtime policy, strict types, the governed 23-test deterministic suite, V8 coverage evidence, schema identity, operation identity and additional Node compatibility.
- `docs.yml` validates README structure, badges, Mermaid styling, documentation references and the directory-only repository map.
- `security.yml` independently gates supply-chain policy, CodeQL, npm Audit, Trivy and pull-request Dependency Review when available.
- `live-smoke.yml` is the explicit externally configured endpoint boundary only.

See [`docs/ci-quality-gates.md`](docs/ci-quality-gates.md) and [`docs/operations.md`](docs/operations.md) for evidence semantics and failure interpretation.

## Repository map

```text
.
├── .github/
├── docs/
├── operations/
├── schema/
├── scripts/
├── src/
└── tests/
```

Only directories are shown; root files own runtime/toolchain pins and repository configuration.

## Documentation

| Guide | Use it for |
| --- | --- |
| [`docs/architecture.md`](docs/architecture.md) | Contract ownership, runtime/transport/evidence boundaries, deeper color-coded flow |
| [`docs/operations.md`](docs/operations.md) | Commands, identity lifecycle, transport/live execution, evidence, dependencies, triage |
| [`docs/graphql-testing.md`](docs/graphql-testing.md) | GraphQL execution, operation and persisted-document testing |
| [`docs/security-and-limits.md`](docs/security-and-limits.md) | Operation limits and security policy |
| [`docs/schema-evolution.md`](docs/schema-evolution.md) | Schema fingerprinting and evolution |
| [`docs/live-endpoint.md`](docs/live-endpoint.md) | Explicit external endpoint boundary |
| [`docs/ci-quality-gates.md`](docs/ci-quality-gates.md) | CI/evidence/security conclusions |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Change-quality expectations |
| [`SECURITY.md`](SECURITY.md) | Security policy |

The framework optimizes for **contract ownership, deterministic failure attribution, governed schema/operation identities, and evidence that proves the intended checks actually executed**.
