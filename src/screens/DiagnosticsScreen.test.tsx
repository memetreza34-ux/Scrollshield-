import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { DiagnosticsScreen } from './DiagnosticsScreen';
import { expectNoA11yViolations } from '../test/a11y';

describe('DiagnosticsScreen', () => {
  it('reports that detection is inactive on the web fallback', async () => {
    render(<DiagnosticsScreen navigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Kurzvideo-Erkennung inaktiv/i)).toBeInTheDocument();
    });
  });

  it('explains that no observations exist outside the Android app', async () => {
    render(<DiagnosticsScreen navigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/keine Beobachtungen zur Verfügung/i)).toBeInTheDocument();
    });
  });

  it('lists the configured detection signatures so they can be compared on device', async () => {
    render(<DiagnosticsScreen navigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Hinterlegte Erkennung')).toBeInTheDocument();
    });
    expect(screen.getByText(/Ganze App ist ein Kurzvideo-Feed/i)).toBeInTheDocument();
  });

  it('states the privacy boundary', async () => {
    const { container } = render(<DiagnosticsScreen navigate={vi.fn()} />);

    await waitFor(() => {
      expect(container).toHaveTextContent(/keine Texte, Nachrichten oder Eingaben/i);
    });
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<DiagnosticsScreen navigate={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Hinterlegte Erkennung')).toBeInTheDocument();
    });
    await expectNoA11yViolations(container);
  });
});
