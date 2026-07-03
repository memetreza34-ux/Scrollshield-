import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FEATURE_FLAGS } from '../config/featureFlags';
import { expectNoA11yViolations } from '../test/a11y';
import { SubscriptionScreen } from './SubscriptionScreen';

describe('future premium architecture', () => {
  it('keeps every post-release feature disabled', () => {
    expect(Object.values(FEATURE_FLAGS).every((enabled) => enabled === false)).toBe(true);
  });

  it('provides an accessible subscription screen without exposing it in the release app', async () => {
    const { container } = render(
      <SubscriptionScreen
        plans={[
          {
            id: 'free',
            name: 'Basis',
            description: 'Lokaler Schutz ohne Konto.',
            features: ['Fokus-Timer', 'Lokale Regeln'],
            actionLabel: 'Auswählen',
          },
        ]}
        onBack={vi.fn()}
        onSelectPlan={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Tarife' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Auswählen' })).toBeInTheDocument();
    await expectNoA11yViolations(container);
  });
});
