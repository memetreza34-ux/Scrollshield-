# ScrollShield Adaptive Anti-Binge Friction

Status: **implemented as deterministic local Android behavior; not machine learning and not an AI prediction system**.

## Purpose

Adaptive Anti-Binge Friction makes repeated intentional app opens progressively less automatic without immediately turning every repeat into a hard block.

It reuses ScrollShield's existing local Anti-Binge opening counter. No second tracking database, cloud profile, behavioral model, or remote scoring service is introduced.

## What counts

Only a successful normal `Bewusst öffnen` action is recorded as an intentional open.

The following do **not** increment the adaptive opening counter:

- merely displaying the overlay;
- returning to the home screen;
- a blocked opening;
- a strict-mode emergency release;
- opening ScrollShield itself.

The existing counter keeps bounded timestamps locally and evaluates the current and previous local day so a configured short window still works across midnight.

## Deterministic escalation

Adaptive friction is enabled whenever the existing per-app Anti-Binge switch is enabled.

For the Anti-Binge warning window:

1. below the configured warning threshold, the normal configured opening delay is unchanged;
2. once the number of recent successful intentional opens reaches the warning threshold, the next normal opening pause increases by **5 seconds**;
3. each additional recent intentional open adds another **5 seconds**;
4. the adaptive delay is capped at **60 seconds**;
5. a manually configured base delay longer than 60 seconds is never reduced.

This is a fixed local formula. ScrollShield must not describe it as AI, prediction, personalization, diagnosis, or a learned addiction score.

## Relationship to the strict Anti-Binge block

Adaptive friction does not replace the existing strict Anti-Binge threshold.

The order is:

`base pause -> adaptive warning/friction -> strict Anti-Binge block`

When the configured strict block threshold is reached inside its block window, the existing strict block wins. Adaptive friction never weakens a strict result.

## Emergency and safety behavior

Adaptive friction applies only to normal intentional openings.

It must **not** lengthen or rewrite:

- the strict emergency-unlock countdown;
- the emergency reason requirement;
- the daily emergency maximum;
- the always-available `Zurück zum Startbildschirm` action.

Emergency timing remains owned by `EmergencyUnlockPolicy`.

## Local transparency

When adaptive friction is active, the Android overlay states:

- how many recent intentional opens were counted;
- the configured warning-window length;
- the resulting local opening delay.

A local protection-history warning also records the effective adaptive delay. No developer server is required for this behavior.

## Compatibility

No new persisted AppConfig field is required. Adaptive friction derives entirely from existing bounded values:

- `antiBinge.enabled`
- `antiBinge.warningThreshold`
- `antiBinge.warningTimeframe`
- `antiBinge.blockThreshold`
- `antiBinge.blockTimeframe`
- `openDelay`

This avoids a new V0.7/V1 migration surface. Existing configurations retain their stored Anti-Binge thresholds; configurations with Anti-Binge disabled receive no adaptive escalation.

## Required verification

Before this behavior can be called release-verified, the exact Android candidate must prove:

1. Anti-Binge disabled keeps the configured base opening delay unchanged after repeated opens.
2. Anti-Binge enabled stays at the base delay below the warning threshold.
3. Reaching the warning threshold increases the next normal opening delay by exactly 5 seconds.
4. Further successful intentional opens increase the delay in 5-second steps up to 60 seconds.
5. A configured base delay above 60 seconds is never shortened.
6. The configured strict Anti-Binge threshold still produces a strict block rather than an adaptive normal opening.
7. Returning home without opening the app does not increment the counter.
8. Emergency unlock timing is unchanged by adaptive friction.
9. The short recent-open window still behaves correctly across local midnight.
10. The overlay and local event text report the escalation honestly and remain readable with the existing accessibility matrix.
