# Engineering Checks

Use these commands before merging or shipping changes.

## Daily Development

```bash
npm run dev
```

## Full Local Gate

```bash
npm run verify
```

This runs:

- TypeScript and ESLint
- Node/npm runtime version check
- Prettier format check
- Package, build, and optional native version/App-ID consistency
- Android project configuration guard for SDK levels, release hardening, signing opt-in, and permissions
- Runtime dependency registry consistency
- Third-party notice/license consistency
- Tracked-file secret and local Android signing/config checks
- Store listing packet and screenshot asset checks
- Non-strict release-readiness report for manual store blockers
- Unit and component tests
- Structural accessibility checks with `axe-core`
- Source guards for 44px touch targets and context-labeled switches
- Production build
- PWA manifest, complete offline precache, and navigation-fallback checks
- Public privacy-policy page check
- Runtime dependency, source network API, and production tracker checks
- Bundle budget checks

The production build also runs `npm run generate:sw` internally so `dist/sw.js` is created deterministically after Vite
finishes.

Secondary text is centrally raised to Zinc 400 in `src/index.css`. This keeps small labels above a 6.9:1 contrast
ratio on the app's Zinc 900 and Zinc 950 surfaces; do not weaken that override without a rendered contrast audit.

Interactive controls also receive a global 44px minimum size. `npm run check:a11y` protects that rule and rejects
`Switch` components without a contextual `ariaLabel`.

## Coverage

```bash
npm run test:coverage
```

Coverage is intentionally focused on `src/lib/**`, where the app's protection, storage, stats, and normalization logic
live. UI smoke tests still run through `npm run test`.

## Bundle Analysis

```bash
npm run analyze
```

This creates `dist/bundle-report.html`. The report is ignored by git and excluded from the PWA precache.

## Release Readiness

```bash
npm run check:release
npm run check:release:strict
```

The normal command reports legal/contact/store-readiness blockers without failing local development. The strict command
is meant for a real store submission and fails until the placeholders are replaced with verified production data.
It also flags risky public-facing claims such as "unavoidable blocker" wording and release UI references to the Android
Accessibility API. When an Android project exists, it also protects the manifest against enabling Accessibility
services, sensitive Android permissions, app data backups, cleartext HTTP traffic, or unminified release builds.

`npm run verify` includes the non-strict release check so CI logs the remaining manual launch blockers without blocking
ordinary development.

## Readiness Snapshot

```bash
npm run readiness
```

This prints a compact release-readiness snapshot. Required technical checks fail the command; known manual items such as
legal details, support mailbox verification, and local Android SDK/JDK setup are reported as attention items.

## PWA Icons

```bash
npm run generate:icons
```

Generates the PNG launcher icons from `public/pwa-icon.svg`.
