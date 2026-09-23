# Short-Video Detection

How ScrollShield recognises a Reels/Shorts/TikTok feed, what it is allowed to see, and how to fix detection when a host
app changes.

## The problem

`UsageStatsManager` reports package names only. It can tell that `com.instagram.android` is in the foreground; it
cannot tell whether the user is in the Reels player, in DMs, or on a profile. Every feed-level rule — daily minutes in
Reels, stop after N swipes, session limits inside the feed — needs information that only the accessibility API exposes.

There is no second path. Screen recording (`MediaProjection`) shows pixels but requires a permanent capture consent and
is far more invasive; reading the notification stream says nothing about the current screen.

## What the service does

`ShortVideoWatchService` (Kotlin, `android/app/src/main/java/app/scrollshield/mobile/`) subscribes to three event
types:

| Event                         | Use                                                          |
| ----------------------------- | ------------------------------------------------------------ |
| `TYPE_WINDOW_STATE_CHANGED`   | Class name of the new window → cheap surface check           |
| `TYPE_WINDOW_CONTENT_CHANGED` | Throttled view-tree scan (max. every 700 ms) → view-id check |
| `TYPE_VIEW_SCROLLED`          | One counted swipe, debounced at 250 ms                       |

When a protected package's short-video surface appears, the service starts a feed session: it measures time, counts
scroll events, and asks `AppMonitorService` to show the interruption overlay once one of the user's limits is reached.

Every event from a package without a rule returns on the first line. Time is accumulated into a per-day bucket in the
app's encrypted preferences and read back by the web layer through `getShortVideoUsage()`.

## Privacy boundary

This is enforced in code and must stay that way:

- The service reads **only** `viewIdResourceName` and window class names.
- It never calls `getText()` or `getContentDescription()`. No message, caption, password or search term is readable by
  it — the calls are simply not present.
- `canPerformGestures` is **not** requested in `accessibility_service_config.xml`. The only global action used is
  `GLOBAL_ACTION_BACK`, which leaves the feed; the service cannot tap or swipe inside another app.
- Nothing is transmitted. There is no network code in the service and the app has no backend.

The previous `ScrollShieldContentFilterService` did the opposite — it walked the whole tree calling `getText()` and
matched against a hardcoded keyword list. It was deleted, not disabled.

## Detection signatures are heuristics

View ids are not a public API. `com.instagram.android:id/clips_viewer_view_pager` exists because Instagram named it
that way in some build, and it can be renamed without warning. **Detection will silently degrade when a host app ships
a redesign.**

Mitigations built in:

1. **Hints are data, not code.** They live in `src/lib/shortVideoSignatures.ts` and are synced to the native layer with
   the rules. Correcting a hint is a TypeScript change, not a Kotlin one.
2. **TikTok needs no hints.** Its entire app is the feed, so `alwaysShortVideo: true` cannot break.
3. **Calibration samples.** The service stores the last 20 observed view-id/class-name sets. `getCalibrationSamples()`
   exposes them so you can see what the device really reports. A sample is only stored when it differs from the
   previous one, and at most every 10 seconds, so a long scroll session does not turn into constant encrypted writes.

### Verifying or fixing a signature

1. Enable the accessibility service on the device.
2. Open the target app and go to its short-video feed.
3. Read the samples (in the app's debug screen, or via `adb`):
   ```bash
   adb shell dumpsys accessibility | grep -i scrollshield
   ```
4. Compare the reported view ids with the hints for that platform in `src/lib/shortVideoSignatures.ts`.
5. Add the identifying fragment — prefer something stable and feed-specific (`clips_viewer`) over a generic one
   (`recycler_view`, `container`), which would match the normal feed too and cause false positives.
6. `npm run test -- shortVideoSignatures` covers the matching logic; add a case for the new hint.

**Before every release, the signatures must be re-verified per platform on a current app version.** There is no
automated way to catch a renamed view id — the failure mode is silent.

## Limits

- Detection needs the user to enable the service manually in Android settings. It cannot be granted programmatically.
- After a false negative (renamed view id) the feed is not recognised and feed rules do not fire. App-level delays and
  blocks are unaffected — they run on Usage Access.
- A false positive (too generic a hint) interrupts the user outside the feed. Prefer missing a feed over this.
- OEM battery managers can kill the accessibility service like any other. Android usually restarts it, but not
  instantly.
- **iOS has no equivalent.** The Screen Time API blocks whole apps or categories; there is no interface to observe a
  surface inside another app. Feed-level rules are Android-only and the UI must say so on iOS.

## Play Console

The accessibility use needs a declaration and a prominent in-app disclosure before the user enables it. Both are in
`docs/STORE_SUBMISSION_PACKET.md`; the disclosure text is shown on the permission card in `PermissionsScreen.tsx`.

`IsAccessibilityTool` must be **false** — ScrollShield is not an accessibility tool. The declaration route is
"accessibility API used for a purpose the user explicitly enables", which is how AppBlock, StayFree and comparable apps
ship. Expect a manual review and be ready to submit a demonstration video.
