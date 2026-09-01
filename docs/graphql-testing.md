# GraphQL testing strategy

Coverage is organized around GraphQL-specific failure modes: schema validity, variable coercion, nullability, abstract type resolution, authorization, pagination cursors, mutation behavior, operation naming, fragment validation, HTTP protocol behavior, and GraphQL error envelopes.

Tests prefer semantic assertions over snapshots of entire responses. Canonical named operations under `operations/` are parsed and hashed so persisted-operation identities are reviewable and reproducible.
