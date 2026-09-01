# Schema evolution

`schema/schema.graphql` is the canonical contract. Any schema change must be reviewed together with execution tests and relevant committed operations. CI validates the schema, produces a normalized lexicographic representation, and emits a SHA-256 fingerprint.

Breaking-change policy is intentionally explicit: removing fields or enum values, narrowing nullability incorrectly, or changing abstract type membership requires coordinated consumer review rather than silent fixture updates.
