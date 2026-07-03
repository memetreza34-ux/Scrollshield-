import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

function BrokenChild() {
  throw new Error('boom');
  return null;
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('renders a recovery screen when a child throws', () => {
    render(
      <ErrorBoundary>
        <BrokenChild />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('heading', { name: 'Etwas ist schiefgelaufen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'App neu laden' })).toBeInTheDocument();
  });
});
