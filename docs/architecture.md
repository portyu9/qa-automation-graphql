# Architecture

The framework separates canonical GraphQL contracts from transport and environment concerns. `schema/` contains the committed SDL. `src/schema/` builds and executes the deterministic service. `src/policy/` applies operation limits before execution. `src/manifest/` produces schema and operation identities. `src/client/` owns transport classification and redaction. `src/server/` supplies a loopback HTTP boundary for integration tests.

This separation keeps most qualification deterministic while still exercising a real HTTP boundary where transport behavior matters.
