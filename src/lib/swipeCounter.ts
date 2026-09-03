/**
 * Swipe counting for the in-app short-video feed.
 *
 * This replaces the previous behaviour, where the "swipe" counter was driven by
 * a one-second interval: it incremented whether or not the user moved a finger,
 * so `stopAfterSwipes: 10` really meant "after ten seconds". Here a swipe is a
 * swipe — a vertical gesture past a minimum distance, debounced so one flick
 * cannot register twice.
 *
 * On Android the real counting happens in ShortVideoWatchService via
 * TYPE_VIEW_SCROLLED. This module covers the in-app feed used on the web and
 * for the guided demo, and keeps both definitions of "a swipe" aligned.
 */

export interface SwipeCounterState {
  /** Y position where the current gesture started, null while idle */
  gestureStartY: number | null;
  /** Timestamp of the last counted swipe */
  lastCountedAt: number;
  /** Swipes counted since the feed was opened */
  count: number;
}

export interface SwipeCounterOptions {
  /** Minimum vertical travel in pixels before a gesture counts */
  minDistance?: number;
  /** Minimum gap between two counted swipes */
  debounceMs?: number;
}

export const DEFAULT_SWIPE_OPTIONS = {
  minDistance: 40,
  debounceMs: 250,
} as const;

export const createSwipeCounterState = (): SwipeCounterState => ({
  gestureStartY: null,
  lastCountedAt: 0,
  count: 0,
});

export function beginGesture(state: SwipeCounterState, y: number): SwipeCounterState {
  return { ...state, gestureStartY: y };
}

/**
 * Ends a gesture and counts it when it travelled far enough and the debounce
 * window has passed. Returns the new state plus whether a swipe was counted.
 */
export function endGesture(
  state: SwipeCounterState,
  y: number,
  now: number,
  options: SwipeCounterOptions = {},
): { state: SwipeCounterState; counted: boolean } {
  const minDistance = options.minDistance ?? DEFAULT_SWIPE_OPTIONS.minDistance;
  const debounceMs = options.debounceMs ?? DEFAULT_SWIPE_OPTIONS.debounceMs;

  if (state.gestureStartY === null) {
    return { state, counted: false };
  }

  const distance = Math.abs(y - state.gestureStartY);
  const idle = { ...state, gestureStartY: null };

  if (distance < minDistance) {
    return { state: idle, counted: false };
  }

  if (now - state.lastCountedAt < debounceMs) {
    return { state: idle, counted: false };
  }

  return {
    state: { gestureStartY: null, lastCountedAt: now, count: state.count + 1 },
    counted: true,
  };
}

/** Wheel/trackpad equivalent of a swipe, for desktop browsers. */
export function applyWheel(
  state: SwipeCounterState,
  deltaY: number,
  now: number,
  options: SwipeCounterOptions = {},
): { state: SwipeCounterState; counted: boolean } {
  const minDistance = options.minDistance ?? DEFAULT_SWIPE_OPTIONS.minDistance;
  const debounceMs = options.debounceMs ?? DEFAULT_SWIPE_OPTIONS.debounceMs;

  if (Math.abs(deltaY) < minDistance) return { state, counted: false };
  if (now - state.lastCountedAt < debounceMs) return { state, counted: false };

  return {
    state: { ...state, lastCountedAt: now, count: state.count + 1 },
    counted: true,
  };
}

/**
 * True when the counter just crossed a multiple of the configured threshold,
 * i.e. the moment an interruption is due.
 */
export function shouldInterrupt(count: number, stopAfterSwipes: number | undefined): boolean {
  if (!stopAfterSwipes || stopAfterSwipes <= 0) return false;
  return count > 0 && count % stopAfterSwipes === 0;
}
