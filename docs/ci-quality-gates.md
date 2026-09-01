# CI quality gates

The CI workflow performs repository policy checks, immutable Action pin validation, TypeScript qualification, Vitest coverage, schema contracts, operation-manifest contracts, integration tests, and Node 22 compatibility. Its stable conclusion is `ci-gate`.

The docs workflow validates README structure and repository-map truthfulness. The security workflow independently executes CodeQL, npm Audit, Trivy, and change-aware Dependency Review when GitHub Dependency Graph is available. The stable security conclusion is `security-gate`.
