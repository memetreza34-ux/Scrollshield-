/**
 * Short-video surface signatures
 * ══════════════════════════════
 * The accessibility service cannot ask an app "am I in the Reels feed?".
 * It only sees the view tree: resource ids (`com.instagram.android:id/clips_viewer_…`)
 * and class names of the visible window. These signatures translate that raw
 * material into "the short-video surface of platform X is on screen".
 *
 * IMPORTANT – these are heuristics, not a contract:
 * - Every host app can rename its view ids in any release. When Instagram ships
 *   a new Reels player, detection degrades silently until the hints are updated.
 * - Hints are therefore data, synced down to the native layer at runtime. They
 *   can be corrected through an app update without touching Kotlin, and the
 *   calibration screen (Settings → Diagnose) reports what the service actually
 *   sees on the device so a wrong hint can be identified.
 * - `alwaysShortVideo` marks apps whose main surface IS the short-video feed
 *   (TikTok). There, presence of the package is enough and no hint can break.
 *
 * The hints below were derived from public view-id naming of the respective
 * apps and MUST be verified on a real device per platform before release; see
 * docs/SHORT_VIDEO_DETECTION.md for the calibration procedure.
 */

export interface ShortVideoSignature {
  /** Platform id from BUILTIN_PLATFORMS */
  platformId: string;
  /**
   * Fragments matched against `AccessibilityNodeInfo.viewIdResourceName`.
   * Matching is case-insensitive and substring based.
   */
  viewIdHints: string[];
  /**
   * Fragments matched against the window/fragment class name reported by
   * TYPE_WINDOW_STATE_CHANGED events.
   */
  classNameHints: string[];
  /**
   * True when the app's primary surface is already a short-video feed, so no
   * view-tree inspection is needed.
   */
  alwaysShortVideo?: boolean;
}

export const SHORT_VIDEO_SIGNATURES: ShortVideoSignature[] = [
  {
    platformId: 'instagram',
    viewIdHints: ['clips_viewer', 'clips_video', 'reel_viewer', 'clips_tab'],
    classNameHints: ['ClipsViewerFragment', 'ReelViewerFragment', 'ClipsTabFragment'],
  },
  {
    platformId: 'tiktok',
    viewIdHints: [],
    classNameHints: [],
    alwaysShortVideo: true,
  },
  {
    platformId: 'youtube',
    viewIdHints: ['reel_recycler', 'reel_player', 'reel_watch', 'shorts_'],
    classNameHints: ['ReelWatchFragment', 'ShortsFragment', 'ReelsPlayerFragment'],
  },
  {
    platformId: 'facebook',
    viewIdHints: ['reels_', 'reel_viewer', 'video_home'],
    classNameHints: ['ReelsViewerFragment', 'ShortFormVideoFragment'],
  },
  {
    platformId: 'snapchat',
    viewIdHints: ['spotlight', 'discover_feed_video'],
    classNameHints: ['SpotlightFragment', 'SpotlightViewerFragment'],
  },
  {
    platformId: 'twitter',
    viewIdHints: ['immersive_', 'video_player_view', 'fullscreen_video'],
    classNameHints: ['ImmersiveMediaActivity', 'ImmersiveTimelineFragment'],
  },
  {
    platformId: 'reddit',
    viewIdHints: ['video_player', 'feed_video', 'watch_feed'],
    classNameHints: ['VideoFeedScreen', 'WatchFeedScreen'],
  },
  {
    platformId: 'pinterest',
    viewIdHints: ['watch_tab', 'idea_pin', 'story_pin_video'],
    classNameHints: ['WatchTabFragment', 'IdeaPinFragment'],
  },
];

const signaturesByPlatform = new Map(SHORT_VIDEO_SIGNATURES.map((entry) => [entry.platformId, entry]));

export function getShortVideoSignature(platformId: string): ShortVideoSignature | undefined {
  return signaturesByPlatform.get(platformId);
}

/**
 * Mirrors the matching the native service performs, so the same rules can be
 * exercised in tests and in the calibration screen.
 *
 * `observedViewIds` are the `viewIdResourceName` values currently on screen,
 * `observedClassNames` the class names reported for the active window.
 */
export function matchesShortVideoSurface(
  signature: ShortVideoSignature | undefined,
  observed: { viewIds?: string[]; classNames?: string[] },
): boolean {
  if (!signature) return false;
  if (signature.alwaysShortVideo) return true;

  const viewIds = (observed.viewIds ?? []).map((value) => value.toLowerCase());
  const classNames = (observed.classNames ?? []).map((value) => value.toLowerCase());

  const viewIdHit = signature.viewIdHints.some((hint) => viewIds.some((viewId) => viewId.includes(hint.toLowerCase())));
  if (viewIdHit) return true;

  return signature.classNameHints.some((hint) =>
    classNames.some((className) => className.includes(hint.toLowerCase())),
  );
}
