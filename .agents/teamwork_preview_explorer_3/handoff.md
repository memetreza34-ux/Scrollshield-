# Explorer 3 Investigation & Synthesis Report: System Architecture, Codebase Gaps (R3), and Future Feature Opportunities

**Target Repository**: `ScrollShield`  
**Workspace Path**: `/Users/arman/.gemini/antigravity/scratch/Scrollshield-Brain`  
**Author**: `teamwork_preview_explorer_3`  
**Date**: 2026-09-01  

---

## 1. Observation

Direct, verifiable observations from the ScrollShield codebase:

### 1.1 Architecture & Bridge Disconnect
- **Vanilla BridgeActivity**: `android/app/src/main/java/app/scrollshield/mobile/MainActivity.java:1-6` contains only `public class MainActivity extends BridgeActivity {}`. There are no custom Capacitor plugin bindings, no `onNewIntent` handler, and no bidirectional event channel between native Android and the React runtime.
- **Unconnected Native Service**: `android/app/src/main/java/app/scrollshield/mobile/ScrollShieldContentFilterService.java:11-69` is a standalone `AccessibilityService`. When triggering an intervention (`triggerScrollShieldIntervention()`, lines 53-63), it fires an `Intent` to `MainActivity` with `putExtra("ACTION", "TRIGGER_CONTENT_SHIELD")` and executes `performGlobalAction(GLOBAL_ACTION_HOME)`. However, `MainActivity` does not capture this intent or notify the web view.
- **Web Simulation Layer**: `src/App.tsx:20-205` and `src/screens/ProtectionFlow.tsx:20-485` manage protection flows through an in-memory state variable `simulatedAppToOpen` (`src/types.tsx:461`). In the web app, interventions only trigger when a user manually clicks "App-Öffnen simulieren" (`src/screens/ConfigScreens.tsx:536-544` and `src/screens/MainScreens.tsx:451-460`).
- **Capacitor Configuration**: `capacitor.config.ts:1-10` only defines basic app ID (`app.scrollshield.mobile`), app name, and `webDir: 'dist'`. Plugins such as `@capacitor/preferences`, `@capacitor/app`, or `@capacitor/local-notifications` are not listed in `package.json:47-54` (which only contains `@capacitor/android: ^8.4.1`, `@capacitor/core: ^8.4.1`, `lucide-react`, `motion`, `react: ^19.0.0`, `react-dom: ^19.0.0`).

### 1.2 Storage & Persistence Mechanism
- **In-Memory & Web Storage**: App persistence is driven by `src/lib/storage.ts:1-238`. It splits the state into five chunked keys:
  - `scrollshield_settings_v3` (obfuscated)
  - `scrollshield_profiles_v3` (obfuscated)
  - `scrollshield_stats_v3` (plaintext JSON)
  - `scrollshield_history_v3` (plaintext JSON, capped at 100 events, 50 focus sessions; lines 118-121)
  - `scrollshield_meta_v3` (metadata versioning; line 125)
- **Homebrew XOR Obfuscation**: `src/lib/storage.ts:18-49` uses a single-byte XOR key (`^ 42`) combined with `encodeURIComponent` and `btoa`/`atob`. As commented on lines 16-17, this is basic obfuscation and not cryptographically secure storage.
- **Synchronous Web Storage Dependency**: In native Capacitor WebViews, `localStorage` can be purged by the OS under low-memory conditions or when WebView cache is cleared. There is currently no native DataStore, EncryptedSharedPreferences, or SQLite backing.

### 1.3 Background Lifecycle, Battery & Event Flooding
- **Heavy Accessibility Event Capture**: `android/app/src/main/res/xml/accessibility_service_config.xml:3-5` configures the service with `accessibilityEventTypes="typeWindowContentChanged|typeWindowStateChanged|typeViewTextSelectionChanged"` and `notificationTimeout="100"`.
- **Unthrottled UI-Thread DOM Traversal**: `ScrollShieldContentFilterService.java:22-51` executes a recursive traversal `checkNodeForToxicContent(AccessibilityNodeInfo node)` across every child node on the main thread for every window content change without package filtering, debouncing, or caching.
- **Hardcoded Keyword Filtering**: `ScrollShieldContentFilterService.java:17-19` hardcodes `BLOCKED_KEYWORDS = Arrays.asList("nsfw", "porn", "onlyfans", "gore", "doomscroll");` without dynamic synchronization from `AppState.appsConfig`.
- **Interval-Based Polling in React**: `src/App.tsx:58` runs `setInterval(syncFocusRuntime, 15_000)` whenever `isFocusModeActive` is true. `src/screens/ActiveSessionScreen.tsx:52-76` runs a 1-second interval for tracking seconds and swiping simulation. These timers run in the JS event loop without background service alignment or visibility-change throttling.

### 1.4 Permission Strategy Conflict & Release Gates
- **Policy vs Manifest Conflict**: `PERMISSION_MATRIX.md:62-69` explicitly specifies: *"Bedienungshilfen (Accessibility Service) ... Status: VERZICHTEN (für MVP) ... Für Version 1.0 ist kein Accessibility Service vorgesehen."*
- **Strict Release Gate**: `scripts/check-release-readiness.ts:140-147` flags `BIND_ACCESSIBILITY_SERVICE` as a release blocker: `"Remove BIND_ACCESSIBILITY_SERVICE before release."`
- **Android Manifest Declaration**: `android/app/src/main/AndroidManifest.xml:39-49` declares `.ScrollShieldContentFilterService` bound to `android.permission.BIND_ACCESSIBILITY_SERVICE`, and lines 55-56 declare `SYSTEM_ALERT_WINDOW`.
- **Android Project Script**: `scripts/check-android-project.ts:83-91` asserts that only `android.permission.INTERNET` is permitted until native implementation and Play Console declarations are ready.

### 1.5 Codebase Gaps & Error Handling
- **React Error Boundary**: `src/components/ErrorBoundary.tsx:1-65` wraps the entire app (`src/App.tsx:113, 203`), rendering a fallback recovery screen with a reload button.
- **Silent Storage Errors**: In `src/lib/storage.ts:127, 153, 164, 175, 186, 192`, JSON parsing or deobfuscation errors are logged to `console.error` and silently fall back to `DEFAULT_STATE` without alerting the user or generating a repair notification.
- **Feature Flags**: `src/config/featureFlags.ts:10-17` freezes all future flags to `false`:
  - `enableAdvancedStats: false`
  - `enableCloudSync: false`
  - `enablePartnerControl: false`
  - `enableFamilyControl: false`
  - `enableSubscriptions: false`
  - `enableAiRecommendations: false`
- **Testing Coverage**:
  - Web unit tests: 21 test files (`src/*.test.tsx`, `src/lib/*.test.ts`, `src/screens/*.test.tsx`) providing extensive coverage of normalization, rules, and UI rendering.
  - Native tests: `android/app/src/androidTest/java/app/scrollshield/mobile/ExampleInstrumentedTest.java` is empty default template; 0 unit tests for native Java services and 0 end-to-end integration tests.

### 1.6 UI & Design System
- **Strict Visual Language**: `src/components/ui.tsx:1-198` and `src/App.tsx:114-115` define a dark-mode, high-contrast palette:
  - Device container: `bg-zinc-950`, border `border-zinc-800/50`, rounded corners `rounded-[2.5rem]`, shadow `shadow-2xl shadow-black/80`.
  - Component cards: `bg-zinc-900/80`, `backdrop-blur-md`, `rounded-[1.5rem]` or `rounded-[2rem]`.
  - Color semaphores: Emerald (`emerald-400`/`500`) for Focus/Health, Blue (`blue-400`/`500`) for Short-Video/Reels, Amber (`amber-400`/`500`) for Warnings/Emergency, Red (`red-400`/`500`) for Strict Blocks.
  - Controls: Accessible `Switch`, `TimeSelector`, `Header`, `BottomNav` with minimum 44px/48px touch targets.

---

## 2. Logic Chain

From these observations, we derive the technical and architectural realities of the codebase:

```
[Observation 1.1: Empty MainActivity + Isolated ScrollShieldContentFilterService]
    ↓ (Inference 1)
The native Android layer and the React web app currently operate as two disconnected silos. Interventions triggered by native accessibility events cannot render inside the web view, and rules configured in React cannot reach the native accessibility service.

[Observation 1.2: storage.ts relies on localStorage with XOR ^ 42]
    ↓ (Inference 2)
Web `localStorage` lacks transactional safety, encryption, and persistence guarantees in native Android/iOS WebViews. In production, an OS memory cleanup could wipe a user's protection history or rules.

[Observation 1.3: Unthrottled getRootInActiveWindow() on TYPE_WINDOW_CONTENT_CHANGED]
    ↓ (Inference 3)
Recursive node evaluation on every scroll tick without package ID filtering causes substantial CPU usage, battery drain, and frame drops in third-party apps, risking OS battery killer terminations and negative user ratings.

[Observation 1.4: check-release-readiness.ts blocks BIND_ACCESSIBILITY_SERVICE & PERMISSION_MATRIX mandates avoiding it for v1.0]
    ↓ (Inference 4)
There is a fundamental design decision required: v1.0 must rely on `PACKAGE_USAGE_STATS` (Usage Access) + `SYSTEM_ALERT_WINDOW` (Overlays) for standard app deterrence, while content filtering (Accessibility Service) must be either conditionally compiled, gated behind explicit user opt-in for advanced detox, or isolated into a dedicated plugin module.

[Observation 1.5: Unit test coverage high in TS (21 files), 0 native tests, frozen FeatureFlags]
    ↓ (Inference 5)
The TypeScript business logic (rules, state normalizer, session calculations) is mature and solid. The codebase gap lies in the bridge layer, native platform resilience, advanced analytics/interventions, and end-to-end integration.
```

---

## 3. Detailed Requirement R3 Analysis: General Codebase Gaps & Resilience

### 3.1 Architectural Gaps & Bridge Communication
1. **Bi-directional Capacitor Plugin (`ScrollShieldBridgePlugin`)**:
   - *Current State*: Vanilla `BridgeActivity` with no communication channel.
   - *Proposed Solution*: Implement a custom Capacitor plugin (`ScrollShieldPlugin.java` & `src/lib/bridge.ts`) exposing:
     - `syncRules(appsConfig, profiles, activeProfileId)`: Exports JSON rules into native Android `SharedPreferences` / `DataStore`.
     - `getPermissionStatus()`: Queries Android `AppOpsManager` (Usage Access), `Settings.canDrawOverlays`, and `NotificationManagerCompat`.
     - `requestPermission(type)`: Launches appropriate system intent (`ACTION_USAGE_ACCESS_SETTINGS`, `ACTION_MANAGE_OVERLAY_PERMISSION`, `ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`).
     - `onInterventionTriggered(callback)`: Registers a native-to-web listener when an app or reel is intercepted.

2. **Native Overlay vs Full-App Interruption Lifecycle**:
   - *Current State*: `ScrollShieldContentFilterService` attempts to launch `MainActivity` via `startActivity` and calls `performGlobalAction(GLOBAL_ACTION_HOME)`.
   - *Proposed Solution*: 
     - On Android: Implement a lightweight `WindowManager` floating overlay service (`ShieldOverlayService.java`) that renders a native floating view (or a transparent overlay WebView) over the target app without forcefully context-switching the user out of their app stack unless strict blocking is active.
     - On iOS: Leverage `FamilyControls` and `ManagedSettings` (Screen Time API) with native Shield Extensions (`ShieldActionExtension`, `ShieldConfigurationExtension`).

### 3.2 App Persistence & Security Architecture
1. **Secure Storage Migration**:
   - *Current State*: Web `localStorage` with XOR obfuscation (`src/lib/storage.ts:23`).
   - *Proposed Solution*:
     - Web/Desktop fallback: Use `IndexedDB` with Web Crypto API (`AES-GCM-256`) with a key derived from a device-unique salt.
     - Native Android/iOS: Integrate `@capacitor/preferences` with native `EncryptedSharedPreferences` (backed by Android Keystore / MasterKey) or Android Jetpack `DataStore`.
     - Atomic Transactions: Write-ahead staging to prevent corrupted settings if the app is closed during write operations.

2. **Data Sanitization & Privacy Boundary**:
   - *Current State*: `ScrollShieldContentFilterService.java:32-38` reads `node.getText()` across any active window.
   - *Privacy Hazard*: Accessibility services can intercept sensitive fields (passwords, PINs, banking apps, health data).
   - *Required Safeguards*:
     - Strict Package Allowlist: Only inspect nodes if `node.getPackageName()` matches configured social apps (`com.instagram.android`, `com.zhiliaoapp.musically`, `com.google.android.youtube`, `com.facebook.katana`, `com.snapchat.android`).
     - Exclude Password & Input Fields: Skip nodes where `node.isPassword() == true` or class is `android.widget.EditText`.
     - Zero Data Transmission Guarantee: Ensure filtered text is never stored in history or written to unencrypted logs; only log aggregated metadata (e.g. `{ surface: "reels", trigger: "keyword_detected" }`).

### 3.3 Battery & Performance Optimization (Doze Mode & Throttling)
1. **Accessibility Event Throttling & Filtering**:
   - *Current State*: Unthrottled tree traversal on every `typeWindowContentChanged`.
   - *Optimization Plan*:
     - Event Rate Limiting: Introduce a token-bucket debounce filter (max 1 inspection per 250ms per package).
     - Targeted Node Querying: Instead of full-tree recursive traversal `for (int i = 0; i < node.getChildCount(); i++)`, use targeted `findAccessibilityNodeInfosByViewId` or `findAccessibilityNodeInfosByText` only on relevant layout subtrees (e.g. `com.instagram.android:id/reel_viewer_container`).
     - Recycle Nodes: Always call `node.recycle()` in Android API < 30 to prevent native memory leaks.

2. **Android Doze Mode & Background Execution Limits**:
   - *Doze Mode Management*: When the device enters Doze Mode (screen off, stationary), Android suspends network and CPU execution.
   - *Lifecycle Strategy*:
     - Register a `BroadcastReceiver` for `ACTION_SCREEN_ON` and `ACTION_SCREEN_OFF`.
     - When screen is off, suspend all timers, intervals, and polling.
     - Use Android `WorkManager` with `PeriodicWorkRequest` (15-minute interval) for non-urgent tasks like daily streak calculation, history archival, and cleanup.
     - Request `ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` only when user enables "Zuverlässiger Schutz im Hintergrund" in `PermissionsScreen.tsx:247-260`.

### 3.4 Missing Error Handling & Fail-Safes
1. **Storage Corruption Recovery**:
   - *Gap*: Corrupted settings in `loadState` fall back to `DEFAULT_STATE` without notifying the user.
   - *Fix*: Maintain an automatic backup slot (`scrollshield_settings_backup_v3`). If primary chunk fails integrity check, restore from backup and present a non-intrusive banner: *"Einstellungen aus Sicherheitskopie wiederhergestellt."*
2. **Permission Revocation Fail-Safe**:
   - *Gap*: If user revokes Overlay or Usage Access permission via Android Settings while protection is active, the app may fail silently.
   - *Fix*: Native background service monitors permission state and broadcasts `PERMISSION_REVOKED` event to the web layer, triggering the existing `renderSystemHealthBanner()` in `src/screens/MainScreens.tsx:88-124`.

### 3.5 Testing & Verification Pyramid
1. **Current Coverage**: Vitest suite covers unit and screen components (`npm run test`).
2. **Missing Test Layers**:
   - *Native Unit Tests*: JUnit + Robolectric tests in `android/app/src/test/java/` for `ScrollShieldBridgePlugin` and `ScrollShieldContentFilterService`.
   - *Capacitor Bridge Mock*: Mock suite in `src/test/mockBridge.ts` enabling web integration tests for permission queries, native triggers, and storage sync.
   - *E2E Integration*: Playwright tests for full user onboarding, profile switching, emergency unlock countdown, and data import/export workflows.

---

## 4. Future Feature Opportunities (Synthesized Proposals)

All proposed features are designed to integrate seamlessly into existing `FeatureFlags` (`src/config/featureFlags.ts:1-18`), `AppState` (`src/types.tsx:152-206`), and the React/Tailwind visual design language.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ScrollShield Future Feature Matrix                       │
├──────────────────────────┬──────────────────────────────────────────────────┤
│ Feature                  │ Description & Implementation Path                │
├──────────────────────────┼──────────────────────────────────────────────────┤
│ 1. Advanced Analytics    │ • Heatmap of doomscroll hours (00:00 - 24:00)     │
│    (`enableAdvancedStats`)│ • Relapse risk predictor & daily detox score     │
│                          │ • Visual streak & saved time milestone badges    │
├──────────────────────────┼──────────────────────────────────────────────────┤
│ 2. Multi-Modal           │ • Grayscale display filter overlay (desaturate)  │
│    Interventions         │ • Haptic friction pulses during endless swipes    │
│                          │ • Box-breathing (4-4-4-4) & friction challenges  │
├──────────────────────────┼──────────────────────────────────────────────────┤
│ 3. On-Device AI Session  │ • Compassionate, offline summaries via local LLM │
│    Summaries             │ • Zero cloud upload; on-device inference         │
│    (`enableAiRecomm...`) │ • Weekly behavioral reflection & trigger maps    │
├──────────────────────────┼──────────────────────────────────────────────────┤
│ 4. Accountability Buddy  │ • PIN/Biometric lock on settings & emergency unlocks│
│    & Parental Controls   │ • Encrypted weekly report export (QR / JSON)     │
│    (`enablePartnerCtrl`) │ • Asymmetric buddy unlock via local P2P / notify │
└──────────────────────────┴──────────────────────────────────────────────────┘
```

### 4.1 Usage Statistics & Behavioral Analytics (`enableAdvancedStats`)
- **Hourly Doomscroll Heatmap**:
  - *Concept*: Visual 24-hour / 7-day grid showing peak impulsive open windows (e.g. 22:00 - 01:00).
  - *Data Model*: Stored inside `DailyStats.usageMinutes` with hourly bucket metadata (`Record<string, Record<number, number>>`).
  - *UI Fit*: Rendered with Tailwind zinc intensity shades (`bg-zinc-800` -> `bg-emerald-900/40` -> `bg-emerald-500/60` -> `bg-emerald-400`).
- **Digital Detox Score (0-100)**:
  - *Formula*: Computed from ratio of blocked impulsive opens vs successful intentional sessions, adherence to daily limits, and focus mode minutes.
- **Relapse Trigger Identification**:
  - Automatically identifies patterns such as "3 opens within 5 minutes following an emergency unlock" and prompts the user to switch to `strict` or `noscroll` profile.

### 4.2 Customizable Multi-Modal Intervention Styles
- **1. Grayscale Display Filter Overlay**:
  - *Concept*: Strips colors from the screen when opening a protected app or scrolling reels, dramatically decreasing dopamine reward signals.
  - *Implementation*: Android Accessibility Color Inversion / Matrix filter or a hardware-accelerated CSS `backdrop-filter: grayscale(100%)` on the overlay window.
- **2. Progressive Haptic Friction**:
  - *Concept*: Uses `@capacitor/haptics` / Android `Vibrator` to pulse vibration feedback every time a user swipes a short video. Vibration intensity increases exponentially with swipe count (10 swipes = gentle tick; 25 swipes = heavy warning vibration).
- **3. Interactive Friction Challenges**:
  - *Box-Breathing Exercise*: Animated 16-second circle guide (Inhale 4s, Hold 4s, Exhale 4s, Hold 4s) before allowing app open (`src/screens/ProtectionFlow.tsx`).
  - *Intention Statement*: User must type a custom intention phrase (e.g. *"Ich lese nur eine Nachricht und schließe Instagram"*) rather than mindlessly tapping "Trotzdem öffnen".

### 4.3 On-Device AI Summaries of Doomscrolling Sessions (`enableAiRecommendations`)
- **Privacy-First On-Device Summarization**:
  - *Architecture*: Utilizes on-device lightweight models (e.g. Gemma 2B nano / MediaPipe LLM Inference running completely offline on NPU/GPU) or structured rule-based NLP templates.
  - *Function*: Generates non-judgmental, empathetic session summaries:
    > *"In deiner 20-minütigen Instagram-Sitzung hast du 14 Reels im Bereich Comedy angesehen. Dein Abendziel war 15 Minuten. Du hast 5 Minuten vor deinem Schlafenszeit-Fenster aufgehört – starker Fortschritt gegenüber gestern!"*
  - *Compliance*: 100% compliant with `SECURITY.md` and `PRIVACY_POLICY_STRUCTURE.md` (no data leaves the device).

### 4.4 Parental & Accountability Buddy Controls (`enablePartnerControl` & `enableFamilyControl`)
- **Settings & Rule Lock (PIN / Biometrics)**:
  - *Concept*: Protects profile switching, app deletion, and emergency unlock settings with a 4-digit PIN or Device Biometrics (Fingerprint / Face ID via `@capacitor/biometrics`).
- **Accountability Companion Export**:
  - *Concept*: Generates a weekly signed, verifiable Digital Detox Report as an encrypted QR code or PDF that can be shared with an accountability partner.
- **Dual-Approval Emergency Unlock**:
  - *Concept*: For strict profiles, emergency unlocking sends a local notification / challenge code to a partner's device before releasing the app.

---

## 5. UI/Design Integration & Tailwind Constraints Compliance

Every proposed architecture improvement, setting, and UI expansion adheres to the existing design system established in `src/components/ui.tsx`, `src/App.tsx`, and `src/screens/`:

1. **Design Tokens & Palette Consistency**:
   - Backgrounds: `bg-zinc-950` (stage/screen), `bg-zinc-900/80` (cards), `bg-zinc-900/50` (sub-cards).
   - Borders: `border-zinc-800/50` (standard), `border-emerald-500/30` (active focus/health), `border-blue-500/30` (short-videos), `border-amber-500/30` (warnings), `border-red-900/30` (blocks).
   - Typography: Clean sans-serif hierarchy with tracking `tracking-tight` on headings (`text-2xl`/`text-3xl font-bold text-zinc-50`), uppercase `text-xs font-bold tracking-widest text-zinc-500` for section headers, and monospace `font-mono` for timers and metrics.
2. **Component Reusability**:
   - Use standard `Header`, `Switch`, and `TimeSelector` from `src/components/ui.tsx`.
   - New screens or modal flows plug into `App.tsx:121-194` under `<AnimatePresence mode="wait">` without altering the outer phone frame container (`w-full max-w-md h-[100dvh] sm:h-[850px]`).
3. **Accessibility & Touch Targets**:
   - All interactive buttons maintain `min-h-[44px]` or `min-h-[48px]`, explicit `aria-label`, `aria-checked`, and focus-visible rings (`focus-visible:ring-2 focus-visible:ring-emerald-500`).
   - Motion reduced: Respects `MotionConfig reducedMotion="user"` configured in `src/main.tsx:15`.

---

## 6. Caveats

1. **Platform Differences (iOS vs Android)**:
   - On iOS, direct window overlays and background accessibility inspection are technically prohibited by Apple. iOS implementation relies entirely on Apple's `ScreenTime API` (`FamilyControls`, `ManagedSettings`, `DeviceActivity`). All proposed custom floating overlay solutions apply specifically to Android.
2. **Accessibility Service Store Scrutiny**:
   - As documented in `PERMISSION_MATRIX.md` and `check-release-readiness.ts`, publishing an Accessibility Service on the Google Play Store requires extensive justification and accessibility declaration videos. The recommended store-ready path for v1.0 is Usage Access (`PACKAGE_USAGE_STATS`) + Overlays (`SYSTEM_ALERT_WINDOW`).
3. **On-Device LLM Hardware Requirements**:
   - Running on-device LLMs (e.g. MediaPipe / Gemma nano) requires Android devices with modern NPUs (Snapdragon 8 Gen 2+, Tensor G3+, 6GB+ RAM). On entry-level hardware, AI summaries must gracefully fall back to deterministic NLP template synthesis.

---

## 7. Conclusion

ScrollShield has a clean, resilient, and well-tested React/Tailwind frontend with comprehensive domain modeling for distraction control. The primary gaps are:
1. Bridging the frontend state to native Android OS primitives (`Capacitor Plugin`, `WindowManager Overlays`, `EncryptedSharedPreferences`).
2. Aligning the native accessibility service with Google Play permission policies and implementing event throttling to protect battery life.
3. Leveraging existing feature flags (`enableAdvancedStats`, `enableAiRecommendations`, `enablePartnerControl`) to introduce high-impact features (heatmaps, grayscale/haptic interventions, on-device session summaries, and PIN-protected accountability locks) without violating privacy or design constraints.

---

## 8. Verification Method

To independently verify all findings and codebase constraints:

1. **Verify TypeScript & Web Test Suite**:
   ```bash
   npm run typecheck
   npm run test
   ```
2. **Verify Native Android Readiness & Build Constraints**:
   ```bash
   npm run check:android
   npm run check:bundle
   npm run check:a11y
   ```
3. **Verify Release Blockers & Policy Checkers**:
   ```bash
   npm run check:release
   ```
4. **Inspect Key Source Files**:
   - `src/lib/storage.ts` (Storage architecture & XOR obfuscation)
   - `src/lib/state.ts` & `src/types.tsx` (Data structures & normalization)
   - `android/app/src/main/AndroidManifest.xml` & `ScrollShieldContentFilterService.java` (Native service & permissions)
   - `scripts/check-release-readiness.ts` (Store gatekeeper rules)
