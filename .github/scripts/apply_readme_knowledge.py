from pathlib import Path
import re

path = Path('README.md')
text = path.read_text(encoding='utf-8')
marker = '## Repository map\n'
section = '''## Confidence boundaries

GraphQL quality is multi-dimensional: schema shape, operation governance, execution semantics, HTTP transport, persisted identity, authorization policy, and live-environment reachability are related but not interchangeable signals.

| Signal | Confidence gained | Deliberate limit |
| --- | --- | --- |
| SDL/schema contracts | The committed type system, nullability, fields, arguments, interfaces/unions, and structural invariants remain machine-valid | Schema validity does not prove resolver correctness, data quality, authorization, latency, or deployed-provider compatibility |
| Operation policy | Parsed operations obey repository governance such as naming, type restrictions, depth/selection rules, and other static constraints | Static operation admissibility does not prove the caller is authorized or the resolver will return correct runtime data |
| Deterministic execution tests | GraphQL execution semantics, variables, errors, abstract types, pagination behavior, and resolver-facing contracts execute against controlled data | In-process execution does not prove HTTP headers/status handling, proxies, TLS, authentication infrastructure, or a deployed service |
| HTTP client integration | POST serialization, headers, timeout/abort behavior, HTTP status handling, GraphQL error handling, and response-shape policy are executable | A controlled transport target does not prove production routing, upstream availability, or business correctness |
| Persisted-operation identity | Canonical operation text maps to a stable governed identity and manifest contract | Identity does not itself prove cache behavior, authorization, rollout coordination, or server-side persisted-query support |
| Authenticated-host binding | A bearer credential can only be emitted to an explicitly approved endpoint hostname | Destination authorization does not prove the remote service is trustworthy, uncompromised, correctly authorized, or semantically healthy |
| Manual live smoke | The configured protected environment can accept a minimal read-only GraphQL request through the real HTTP/auth boundary | A successful `__typename` probe is intentionally narrow: it is not full schema, resolver, authorization, mutation, performance, or dependency health |
| Semantic JUnit / schema / manifest evidence | CI proves governed tests and identity checks actually executed with expected attribution | Artifact presence alone is not proof; native conclusions, expected test identity, and evidence validation must agree |
| CodeQL / npm Audit / Trivy / dependency review | Independent controls inspect source, advisory, repository/configuration/secret, and dependency-diff risk planes | Green scanners are scoped evidence, not proof of vulnerability absence |

Use the **lowest boundary that can disprove the requirement**. Add the live endpoint only when the requirement depends on deployed transport or environment semantics; deterministic repository health should not depend on external availability.

'''
if '## Confidence boundaries\n' not in text:
    if marker not in text:
        raise SystemExit('Repository map marker missing')
    text = text.replace(marker, section + marker)
path.write_text(text, encoding='utf-8')

patterns = [
    re.compile(r'\bGraphQL(?:\.js)?\s+v?\d', re.I),
    re.compile(r'\bNode(?:\.js)?\s+\d', re.I),
    re.compile(r'\bTypeScript\s+v?\d', re.I),
    re.compile(r'\bVitest\s+v?\d', re.I),
    re.compile(r'@types/node\s+v?\d', re.I),
    re.compile(r'\bnpm\s+v?\d', re.I),
]
candidates = []
for md in [Path('README.md'), *Path('docs').rglob('*.md')]:
    for number, line in enumerate(md.read_text(encoding='utf-8').splitlines(), 1):
        if any(pattern.search(line) for pattern in patterns):
            candidates.append(f'{md}:{number}: {line}')
if candidates:
    raise SystemExit('Residual GraphQL/tool version candidates:\n' + '\n'.join(candidates))
