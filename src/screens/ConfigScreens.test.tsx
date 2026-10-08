import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '../test/a11y';
import { DEFAULT_STATE } from '../types';
import { PrivacyScreen } from './ConfigScreens';

describe('PrivacyScreen', () => {
  it('links to the public privacy page and has no obvious accessibility violations', async () => {
    const { container } = render(
      <PrivacyScreen
        state={{ ...DEFAULT_STATE, hasCompletedOnboarding: true }}
        updateState={vi.fn()}
        resetApp={vi.fn()}
        navigate={vi.fn()}
      />,
    );

    expect(screen.getByRole('link', { name: 'Öffentliche Datenschutzseite' })).toHaveAttribute('href', '/privacy.html');
    expect(screen.getByRole('link', { name: 'Open-Source-Lizenzen' })).toHaveAttribute(
      'href',
      '/third-party-licenses.txt',
    );
    await expectNoA11yViolations(container);
  });
});
