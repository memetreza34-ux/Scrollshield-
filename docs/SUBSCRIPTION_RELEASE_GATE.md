# ScrollShield Subscription Release Gate

Status: **BLOCKED / architecture gate only**

This document is an engineering release gate. It is not store copy and it does not mean a paid plan is currently available.

## Product principle

A paid ScrollShield tier must buy the user materially stronger commitment and insight, not basic safety or ownership of their data.

The following remain available independently of a paid entitlement:

- local migration and recovery of existing ScrollShield/V0.7 data;
- export/import and local reset;
- privacy disclosures and diagnostics;
- a safe return-home action from the Android protection overlay;
- a bounded emergency path when the user has configured one;
- access to the user's existing configurations, history and statistics after a downgrade.

A subscription may later unlock deeper automation and commitment features such as more advanced schedules/rules, stronger commitment workflows, richer local insights and additional profile automation. A roadmap item is not a release claim until the implementation and entitlement are verified.

## Billing implementation gate

Do not add a production purchase button, price, trial countdown or `Pro active` badge until every item below is complete on the exact release candidate.

1. **Store billing integration**
   - Google Play Billing is integrated for the Android product.
   - Product/base-plan identifiers come from release configuration, not hard-coded demo values.
   - Purchase acknowledgement is handled correctly.
   - Pending, cancelled, refunded and expired purchases are represented explicitly.

2. **Entitlement source of truth**
   - The app has one typed entitlement state used by every premium gate.
   - A local cache may support temporary offline use, but it cannot permanently convert an unverified purchase into a paid entitlement.
   - Expiry/downgrade never deletes user-owned rules, history, statistics, exports, migration archives or recovery data.

3. **Restore and reinstall**
   - `Restore purchases` works after reinstall and on another eligible device using the same store account.
   - Restore is idempotent and cannot duplicate local data or rules.
   - A failed restore explains the state without silently switching the user to paid.

4. **Offline and failure behavior**
   - Existing verified entitlement has a documented offline grace policy.
   - Billing/network failure cannot block access to free safety, export, migration or recovery functions.
   - The protection service continues to use the last valid local rule set rather than crashing because billing is unavailable.

5. **Testing evidence**
   - Play license-test account purchase.
   - Pending purchase.
   - Cancellation before renewal.
   - Expiry.
   - Refund/revocation.
   - Restore after reinstall.
   - Upgrade/downgrade between supported plans if more than one plan exists.
   - Airplane-mode launch with a previously verified entitlement.
   - Free-user launch with billing unavailable.

6. **Store/legal readiness**
   - Final price, billing period and trial terms match Play Console configuration exactly.
   - Subscription terms, privacy policy and support flow describe billing truthfully.
   - Store screenshots only show premium features that exist in the reviewed build.

## Candidate Free / Pro boundary

This boundary is planning guidance, not a live paywall.

### Free foundation

- reliable whole-app Android protection;
- a useful number of protected apps and one practical profile;
- opening delay, sensible limits and a safe emergency path;
- current-day/basic history visibility;
- migration, export/import, recovery and diagnostics;
- privacy and support functions.

### Pro value target

The paid tier should concentrate value in **Commitment Engine** depth:

- broader/unlimited protected-app and profile automation;
- advanced recurring rule combinations and schedule automation;
- stronger time-locked commitment workflows that are difficult to change impulsively but still have a documented safety exit;
- richer 7/30-day local insights and behavior trends based only on measured data;
- advanced Anti-Binge escalation and configurable commitment friction;
- future trusted-accountability workflows only after their privacy/security model is reviewed.

Do not paywall data rescue, diagnostics, basic safety exits or the ability to export user-owned data.

## Current release decision

Until the billing gate above is complete, ScrollShield must behave as a non-subscription release candidate. Product strategy may discuss a future Pro tier, but production UI must not offer checkout, a trial, paid status or a price.
