import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '../test/a11y';
import { DEFAULT_APP_CONFIG, DEFAULT_STATE } from '../types';
import { ReelsProtectionScreen } from './ReelsProtectionScreen';

describe('ReelsProtectionScreen', () => {
  it('provides contextual control names and has no obvious accessibility violations', async () => {
    const state = {
      ...DEFAULT_STATE,
      appsConfig: {
        ...DEFAULT_STATE.appsConfig,
        instagram: {
          id: 'instagram',
          ...DEFAULT_APP_CONFIG,
          reelsProtection: { ...DEFAULT_APP_CONFIG.reelsProtection, enabled: true, mode: 'limit' as const },
        },
      },
    };
    const { container } = render(<ReelsProtectionScreen state={state} updateState={vi.fn()} navigate={vi.fn()} />);

    expect(screen.getByRole('switch', { name: 'Instagram Kurzvideo-Schutz' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Instagram Tageslimit für Kurzvideos' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Instagram Sitzungslimit für Kurzvideos' })).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });
});
