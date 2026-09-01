# Security and operation limits

The deterministic executor validates documents against the schema and then enforces bounded depth and selection counts before execution. The HTTP fixture limits request bodies to 1 MB. External endpoint configuration rejects embedded credentials, queries, and fragments.

Diagnostic redaction treats authorization, cookie, token, password, secret, and API-key-shaped fields as sensitive. Repository security workflows scan code and dependencies independently of runtime GraphQL authorization tests.
