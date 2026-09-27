# Security Policy

## Reporting a vulnerability

Please **do not** open a public issue. Email the maintainer privately with details and steps to reproduce. We aim to respond within 72 hours.

## Security model

- Every table has `owner_id` with owner-only row-level security.
- The ingest endpoint requires a per-user `x-ingest-key`; it is the only privileged write path.
- Secrets are stored server-side and never shipped to the browser.
- Rotate your ingest key if you believe it has leaked.
