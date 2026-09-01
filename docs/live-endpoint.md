# Live endpoint boundary

Live endpoint tests are opt-in because external availability, data, authentication, rate limits, and deployment timing are not deterministic pull-request inputs. `RUN_LIVE_GRAPHQL=true` enables a minimal `__typename` probe using `GRAPHQL_ENDPOINT` and an optional runtime token.

When `GRAPHQL_AUTH_TOKEN` is present, `GRAPHQL_AUTH_ALLOWED_HOSTS` is mandatory. It is a comma-separated exact-hostname allowlist with no scheme, credentials, port, path, query, or fragment. Runtime configuration fails before the request if the configured endpoint hostname is not in that approved set. This keeps endpoint syntax validation separate from authorization to receive bearer credentials.

The manual `live-smoke` workflow reads the endpoint and approved-host set from the protected `graphql-live-smoke` environment, reads the token from an environment secret, pins the qualified npm runtime, and retains JUnit evidence for each invocation. Missing expected live-smoke evidence is treated as an artifact failure rather than silently producing an evidence-free run.

CI does not claim live production or staging coverage unless such a job is explicitly invoked with controlled secrets and an approved target. The live probe remains deliberately read-only and minimal; mutation authorization, tenant ownership, rate limits, test-data policy, and wider production verification belong to the environment that owns the endpoint.
