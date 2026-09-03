import { describe, expect, it } from 'vitest';
import { applyWheel, beginGesture, createSwipeCounterState, endGesture, shouldInterrupt } from './swipeCounter';

describe('swipeCounter', () => {
  it('counts a gesture that travels far enough', () => {
    const state = beginGesture(createSwipeCounterState(), 400);
    const result = endGesture(state, 300, 1_000);

    expect(result.counted).toBe(true);
    expect(result.state.count).toBe(1);
  });

  it('ignores a tap that barely moves', () => {
    const state = beginGesture(createSwipeCounterState(), 400);
    const result = endGesture(state, 395, 1_000);

    expect(result.counted).toBe(false);
    expect(result.state.count).toBe(0);
  });

  it('counts upward and downward swipes alike', () => {
    const down = endGesture(beginGesture(createSwipeCounterState(), 100), 300, 1_000);
    const up = endGesture(beginGesture(createSwipeCounterState(), 300), 100, 1_000);

    expect(down.counted).toBe(true);
    expect(up.counted).toBe(true);
  });

  it('debounces a second swipe fired immediately', () => {
    const first = endGesture(beginGesture(createSwipeCounterState(), 400), 300, 1_000);
    const second = endGesture(beginGesture(first.state, 400), 300, 1_050);

    expect(second.counted).toBe(false);
    expect(second.state.count).toBe(1);
  });

  it('counts again once the debounce window passed', () => {
    const first = endGesture(beginGesture(createSwipeCounterState(), 400), 300, 1_000);
    const second = endGesture(beginGesture(first.state, 400), 300, 1_400);

    expect(second.counted).toBe(true);
    expect(second.state.count).toBe(2);
  });

  it('does not count without a started gesture', () => {
    const result = endGesture(createSwipeCounterState(), 300, 1_000);

    expect(result.counted).toBe(false);
  });

  it('does not count merely because time passes', () => {
    // The old implementation incremented on a 1s interval; make sure an idle
    // counter stays at zero no matter how far the clock moves.
    let state = createSwipeCounterState();
    for (let second = 1; second <= 60; second++) {
      state = endGesture(state, 300, second * 1_000).state;
    }

    expect(state.count).toBe(0);
  });

  it('counts wheel scrolling on desktop', () => {
    const first = applyWheel(createSwipeCounterState(), 120, 1_000);
    const tooSoon = applyWheel(first.state, 120, 1_100);
    const later = applyWheel(first.state, 120, 1_600);

    expect(first.counted).toBe(true);
    expect(tooSoon.counted).toBe(false);
    expect(later.state.count).toBe(2);
  });

  it('ignores tiny wheel deltas', () => {
    expect(applyWheel(createSwipeCounterState(), 5, 1_000).counted).toBe(false);
  });

  it('signals an interruption on every multiple of the threshold', () => {
    expect(shouldInterrupt(10, 10)).toBe(true);
    expect(shouldInterrupt(20, 10)).toBe(true);
    expect(shouldInterrupt(11, 10)).toBe(false);
    expect(shouldInterrupt(0, 10)).toBe(false);
  });

  it('never interrupts when the threshold is off', () => {
    expect(shouldInterrupt(50, 0)).toBe(false);
    expect(shouldInterrupt(50, undefined)).toBe(false);
  });
});
