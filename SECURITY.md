# Security policy

Do not commit credentials, bearer tokens, cookies, API keys, production endpoints with embedded credentials, or captured responses containing customer data.

The framework rejects credential-bearing endpoint URLs, redacts secret-shaped diagnostic fields, bounds HTTP request bodies, and applies operation depth/selection limits before execution. CI scans the locked dependency graph and repository content with npm Audit, Trivy, and CodeQL.

Report suspected vulnerabilities privately through the repository's GitHub security reporting mechanism rather than opening a public issue with exploit details.
