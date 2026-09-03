import { describe, expect, it } from 'vitest';
import { SHORT_VIDEO_SIGNATURES, getShortVideoSignature, matchesShortVideoSurface } from './shortVideoSignatures';
import { BUILTIN_PLATFORMS } from '../types';

describe('short video signatures', () => {
  it('covers every built-in platform that declares a short-video surface', () => {
    const platformsWithFeed = BUILTIN_PLATFORMS.filter((platform) => platform.shortVideoSurface).map(
      (platform) => platform.id,
    );

    for (const platformId of platformsWithFeed) {
      expect(getShortVideoSignature(platformId), `missing signature for ${platformId}`).toBeDefined();
    }
  });

  it('only references platforms that exist', () => {
    const knownIds = new Set(BUILTIN_PLATFORMS.map((platform) => platform.id));
    for (const signature of SHORT_VIDEO_SIGNATURES) {
      expect(knownIds.has(signature.platformId), `unknown platform ${signature.platformId}`).toBe(true);
    }
  });

  it('gives every signature something to match on', () => {
    for (const signature of SHORT_VIDEO_SIGNATURES) {
      const hasHints = signature.viewIdHints.length > 0 || signature.classNameHints.length > 0;
      expect(signature.alwaysShortVideo === true || hasHints, `${signature.platformId} can never match`).toBe(true);
    }
  });

  it('matches a Reels view id', () => {
    const signature = getShortVideoSignature('instagram');
    expect(
      matchesShortVideoSurface(signature, {
        viewIds: ['com.instagram.android:id/clips_viewer_view_pager'],
      }),
    ).toBe(true);
  });

  it('does not match the normal Instagram feed', () => {
    const signature = getShortVideoSignature('instagram');
    expect(
      matchesShortVideoSurface(signature, {
        viewIds: ['com.instagram.android:id/feed_recycler_view', 'com.instagram.android:id/action_bar'],
      }),
    ).toBe(false);
  });

  it('matches on class names when no view id is available', () => {
    const signature = getShortVideoSignature('youtube');
    expect(
      matchesShortVideoSurface(signature, { classNames: ['com.google.android.apps.youtube.ReelWatchFragment'] }),
    ).toBe(true);
  });

  it('is case insensitive', () => {
    const signature = getShortVideoSignature('instagram');
    expect(matchesShortVideoSurface(signature, { viewIds: ['COM.INSTAGRAM.ANDROID:ID/CLIPS_VIEWER'] })).toBe(true);
  });

  it('treats TikTok as always short video', () => {
    const signature = getShortVideoSignature('tiktok');
    expect(matchesShortVideoSurface(signature, {})).toBe(true);
  });

  it('never matches without a signature', () => {
    expect(matchesShortVideoSurface(undefined, { viewIds: ['anything'] })).toBe(false);
  });

  it('returns false for an empty observation', () => {
    expect(matchesShortVideoSurface(getShortVideoSignature('instagram'), {})).toBe(false);
  });
});
