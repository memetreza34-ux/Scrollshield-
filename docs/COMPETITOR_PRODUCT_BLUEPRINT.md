# ScrollShield Competitor Product Blueprint

Research date: 2026-08-06

This document converts competitor research into an ordered ScrollShield product structure. It is a planning reference, not permission to copy brand assets, wording, proprietary code, or distinctive visual identity.

## Product Positioning

ScrollShield should combine three proven approaches:

1. **Mindful interruption** before impulsive opening.
2. **Reliable blocking and schedules** when the user wants firm commitment.
3. **Short-video protection** that attempts to preserve useful parts of an app while reducing endless feeds.

The product must stay honest about platform limits. Whole-app blocking is the stable release target. Reels-only detection is an Android beta until it is proven reliable across app versions and device vendors.

## Competitor Lessons

| Product | Strong pattern | ScrollShield adaptation |
| --- | --- | --- |
| one sec | Immediate, delayed, always-ask and repeated interventions | Opening pause, chosen session duration, optional repeated intervention |
| Opal | Focus sessions, recurring schedules, deep focus, clear progress | Start-now focus, native recurring schedules, strict session mode, real local statistics |
| Jomo | Multiple unlock challenges, app groups, templates, strict mode | Wait, reason, typed phrase, optional PIN/QR later; reusable protection profiles |
| Freedom | Blocklists, recurring schedules, locked mode, session history | Installed-app groups, weekly schedule presets, active-session restrictions, annotations |
| ScreenZen | Escalating delays and short use windows | Delay increases after repeated opens; session windows instead of only daily limits |
| AppBlock | Conditions by time, usage and opening count | Deterministic rules using recurring time windows, usage, opens and focus state |
| Forest | Visual focus progress without fake health claims | Optional garden based only on completed real focus minutes |

## Release Information Architecture

### 1. Home

- Current protection status
- Next scheduled rule
- Protected apps count
- Today's blocked opens, intentional opens and saved time
- Start focus session
- Clear setup warning when required native permissions are missing

### 2. Protected Apps

- App list with real Android package mapping
- Whole-app protection mode
- Opening delay
- Session limit
- Daily limit
- Focus-mode behavior
- Emergency unlock policy
- Reels/Shorts beta settings where supported

### 3. Rules and Schedules

- Start now
- Recurring weekly schedule presets
- Morning, work/school, evening, night and weekend windows
- Normal, strict or block behavior per window
- Usage limit reached
- Open-count threshold
- Focus mode active
- Reusable app groups and custom templates as later enhancements

### 4. Intervention

- Immediate pause
- Delayed pause after a chosen use window
- Always ask how long the user intends to stay
- Re-intervention during long sessions
- Intervention choices:
  - breathing countdown
  - state an intention
  - wait
  - retype a phrase
  - complete a small task
- Cancel and return without opening

### 5. Focus

- Start-now session
- Presets and custom duration
- Select protected app group
- Strict or flexible session
- Optional planned break
- Session note after completion
- Real history and completion rate

### 6. Insights

- Opens by app and hour
- Blocked versus intentional opens
- Session duration
- Emergency unlock count
- Schedule success rate
- Weekly comparison
- No fabricated dopamine, brain, health or percentile claims

### 7. Settings and Trust

- Real permission status
- Local data export/import
- Privacy policy and imprint
- Delete all data
- Diagnostic screen outside production
- Platform capability explanation
- Subscription and restore purchases later

## Current Android Implementation

The release branch contains the first native implementation of several competitor-derived patterns:

- explicit user-controlled foreground protection service
- real Usage Access and overlay status
- opening countdown and return-to-home action
- limited temporary sessions followed by re-intervention
- strict focus and per-app blocking
- per-app daily usage limits
- recurring morning, work/school, evening, night and weekend schedules
- selectable balanced, work/learning, evening/sleep and very-strict presets
- backward-compatible overnight blocked-hour ranges
- deterministic Anti-Binge warning and blocking thresholds
- daily emergency-unlock limits
- reboot and app-update recovery only after prior user activation
- installed-app validation without broad package inventory access
- measured native usage imported into date-correct local statistics

These features remain pre-release until compilation and real-device testing are complete.

## Release Priority

### P0 — Store-capable foundation

- Build, tests and CI green
- Real Android permission bridge
- Real package IDs and installed-app validation
- Privacy and store documents complete
- No fake permission, AI or security claims

### P1 — Real Android whole-app protection

Implemented in the release branch; compilation, reliability, battery, schedule-boundary and device-vendor validation remain open.

### P2 — Core competitor parity

Implemented in the release branch:

- native session and daily limits
- recurring weekly schedule presets
- deterministic Anti-Binge thresholds
- strict focus behavior
- limited emergency access
- real native event and usage statistics

Still open:

- custom per-day/per-app schedule editor
- reusable app groups and user-created schedule templates
- multiple intervention challenges
- strict active-session editing rules
- session notes and schedule success analytics

### P3 — Differentiation

- Android Reels/Shorts beta with a remote kill switch
- Shared-link single-content mode
- Escalating delay based on repeated opens
- Optional partner PIN or physical QR unlock
- Browser extension and desktop companion

### P4 — iOS

- Family Controls entitlement
- App selection
- Device Activity schedules
- Managed Settings shields
- Shield actions and emergency flow
- App Store review package

## Free and Pro Structure

### Free

- One protected app
- One recurring schedule preset
- Standard opening pause
- Basic focus timer
- Seven-day local history

### Pro

- Unlimited protected apps and app groups
- Advanced and custom schedules
- Strict mode
- Re-interventions
- Advanced local insights
- Reels/Shorts beta where supported
- Multiple intervention and unlock methods

Core safety, privacy, data export and emergency access must never be paywalled.

## Non-negotiable Release Rules

- Do not claim that permissions are active unless the operating system confirms them.
- Do not advertise Reels-only blocking as universal or perfectly reliable.
- Do not use Accessibility Service without separate disclosure, affirmative consent and Play Console approval material.
- Do not collect messages, media, passwords, keyboard input or unnecessary installed-app data.
- Do not use AI-generated medical or neurological scores.
- Do not make an active strict rule impossible to escape in a genuine emergency.
