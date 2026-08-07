import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createCommitmentLock } from '../lib/commitmentLock';
import { DEFAULT_STATE } from '../types';
import { ReleasePrivacyScreen } from './ReleasePrivacyScreen';

describe('ReleasePrivacyScreen', () => {
  it('disables full backup import during commitment but preserves export and reset exits', async () => {
    render(
      <ReleasePrivacyScreen
        state={{ ...DEFAULT_STATE, hasCompletedOnboarding: true }}
        updateState={vi.fn()}
        resetApp={vi.fn()}
        navigate={vi.fn()}
        commitmentLock={createCommitmentLock(60, Date.now())}
      />,
    );

    expect(screen.getByText('Backup-Import ist während Commitment gesperrt')).toBeInTheDocument();
    const importInput = screen.getByLabelText('ScrollShield JSON-Export importieren');
    await waitFor(() => expect(importInput).toBeDisabled());

    expect(screen.getByRole('button', { name: /Lokale Daten exportieren/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /App zurücksetzen/ })).toBeEnabled();
  });

  it('keeps import available when commitment is inactive', async () => {
    render(
      <ReleasePrivacyScreen
        state={{ ...DEFAULT_STATE, hasCompletedOnboarding: true }}
        updateState={vi.fn()}
        resetApp={vi.fn()}
        navigate={vi.fn()}
      />,
    );

    const importInput = screen.getByLabelText('ScrollShield JSON-Export importieren');
    await waitFor(() => expect(importInput).toBeEnabled());
    expect(screen.queryByText('Backup-Import ist während Commitment gesperrt')).not.toBeInTheDocument();
  });
});
