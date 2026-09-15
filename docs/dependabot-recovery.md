# Dependabot recovery contract

Dependency recovery and dependency governance have separate authority. Recovery may re-run failed qualification jobs only when the failure is proven transient infrastructure noise. Governance remains the only component allowed to merge. Recovery never edits a Dependabot branch, never creates companion commits, and never changes qualification policy.

A candidate must still be a canonical Dependabot proposal: one GitHub-verified Dependabot commit, directly based on current `main`, with signed minor/patch metadata and an allowlisted dependency-only file set. A stale proposal waits for Dependabot native `rebase-strategy: auto`; the controller does not use GitHub update-branch.

Automatic recovery is capped at one failed-job rerun. Each failed leaf job must contain exactly one failed step, that step must be explicitly allowlisted infrastructure, and its own timestamp-bounded logs must contain a narrow transient network/service signature. Deterministic evidence such as dependency resolution failures, lockfile mismatches, permission errors, disk exhaustion, or HTTP client/policy failures blocks recovery even when transient language is present elsewhere.

For this GraphQL repository, only npm bootstrap/install work and GraphQL qualification-evidence upload are eligible. Repository/docs validation, type checking, governed tests and coverage evidence, schema fingerprint validation, operation-manifest validation, Node 22 API compatibility, npm audit results, Trivy/CodeQL/Dependency Review, aggregate gates, ambiguous job states, and control-plane changes are never converted into retryable infrastructure failures.

Every retry creates a new workflow attempt and the retry ceiling is enforced from `run_attempt`. Existing exact-head CI, Security, and Docs gates must become genuinely successful before governance can merge. Recovery restores one qualification opportunity; it cannot manufacture a green result by skipping, weakening, or reclassifying a substantive failure.
