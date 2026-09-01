# Contributing

Use a focused branch and keep tests deterministic. Changes to `schema/`, `operations/`, `src/policy/`, dependency manifests, and workflow files must include corresponding contract coverage and documentation updates.

Before opening a pull request run `npm run quality`. Live-endpoint smoke tests are deliberately excluded from deterministic CI and require explicit configuration.

Do not weaken validation, coverage thresholds, security scanners, workflow SHA pinning, or evidence checks to make a change pass.
