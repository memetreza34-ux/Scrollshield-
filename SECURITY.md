# Security Policy

ScrollShield is designed as an offline-first app. Rules, history, and statistics stay on the device unless a future
release explicitly adds sync and updates the privacy documentation.

## Reporting Vulnerabilities

Please report security issues privately by email to `support@scrollshield.app`.

Include:

- A short description of the issue
- Steps to reproduce
- Impact and affected versions
- Any screenshots, logs, or proof-of-concept details that help verification

Do not open public issues for vulnerabilities before they have been reviewed.

## Release Gate

Before a store submission, run:

```bash
npm run check:release:strict
```

This intentionally fails while legal placeholders, unverified contact details, or hosted privacy-policy reminders are
still present.
