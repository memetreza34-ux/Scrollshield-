import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '../test/a11y';
import { DEFAULT_APP_CONFIG, DEFAULT_STATE } from '../types';
import { ActiveSessionScreen } from './ActiveSessionScreen';

describe('ActiveSessionScreen', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('labels its icon action and has no obvious accessibility violations', async () => {
    const now = new Date(2030, 0, 1, 12).getTime();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const state = {
      ...DEFAULT_STATE,
      appsConfig: {
        ...DEFAULT_STATE.appsConfig,
        instagram: { id: 'instagram', ...DEFAULT_APP_CONFIG, active: true },
      },
      activeSession: {
        appId: 'instagram',
        startTime: now,
        extensionCount: 0,
        isPaused: false,
      },
    };
    const { container } = render(<ActiveSessionScreen state={state} updateState={vi.fn()} navigate={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'App schließen' })).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });
});
