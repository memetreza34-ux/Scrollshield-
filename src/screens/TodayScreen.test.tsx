import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '../test/a11y';
import { AppState, DEFAULT_APP_CONFIG, DEFAULT_STATE, HistoryEvent } from '../types';
import { TodayScreen } from './TodayScreen';
import { getLocalDateKey } from '../lib/appUtils';

const event = (type: HistoryEvent['type'], minutesAgo: number): HistoryEvent => ({
  id: `${type}-${minutesAgo}`,
  timestamp: Date.now() - minutesAgo * 60_000,
  type,
  appId: 'instagram',
  desc: '',
});

const state = (overrides: Partial<AppState> = {}): AppState => ({
  ...DEFAULT_STATE,
  hasCompletedOnboarding: true,
  appsConfig: { instagram: { ...DEFAULT_APP_CONFIG, id: 'instagram', active: true } },
  ...overrides,
});

describe('TodayScreen', () => {
  it('shows measured interruptions and no estimated saved time', () => {
    render(
      <TodayScreen
        state={state({ history: [event('block', 1), event('warning', 2), event('open', 3)] })}
        updateState={vi.fn()}
        navigate={vi.fn()}
      />,
    );

    expect(screen.getByText('Öffnungen unterbrochen').parentElement).toHaveTextContent('2 Öffnungen unterbrochen');
    expect(screen.queryByText(/gespart/i)).toBeNull();
  });

  it('shows the measured screen time of today and yesterday', () => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const day = (date: Date, screenTimeMinutes: number) => ({
      date: getLocalDateKey(date),
      usageMinutes: { instagram: 48 },
      blockedOpens: 0,
      savedTimeMinutes: 0,
      emergencyUnlocks: 0,
      focusMinutes: 0,
      screenTimeMinutes,
    });
    render(
      <TodayScreen
        state={state({
          operatingSystem: 'android',
          permissions: { ...DEFAULT_STATE.permissions, usageAccess: true, overlay: true },
          dailyStats: { [getLocalDateKey(today)]: day(today, 192), [getLocalDateKey(yesterday)]: day(yesterday, 220) },
        })}
        updateState={vi.fn()}
        navigate={vi.fn()}
      />,
    );

    expect(screen.getByText('3 Std. 12 Min.')).toBeInTheDocument();
    expect(screen.getByText('gestern 3 Std. 40 Min.')).toBeInTheDocument();
    expect(screen.getByText('Davon geschützte Apps: 48 Min.')).toBeInTheDocument();
  });

  it('says screen time is not measured instead of showing zero', () => {
    render(<TodayScreen state={state()} updateState={vi.fn()} navigate={vi.fn()} />);
    expect(screen.getByText(/Nicht gemessen/)).toBeInTheDocument();
  });

  it('offers an evening schedule for late openings and can hide it', () => {
    const lateOpens = Array.from({ length: 4 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - index - 1);
      date.setHours(22, 30, 0, 0);
      return { ...event('open', 0), id: `late-${index}`, timestamp: date.getTime() };
    });
    const updateState = vi.fn();
    const navigate = vi.fn();
    render(<TodayScreen state={state({ history: lateOpens })} updateState={updateState} navigate={navigate} />);

    expect(screen.getByText(/Du öffnest Instagram oft nach 21 Uhr \(4× in 7 Tagen\)/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Abends sperren' }));
    expect(updateState.mock.calls[0][0].schedules[0]).toMatchObject({
      startHour: 21,
      endHour: 7,
      appIds: ['instagram'],
    });
    expect(navigate).toHaveBeenCalledWith('schedule_edit');

    fireEvent.click(screen.getByRole('button', { name: 'Ausblenden' }));
    expect(updateState.mock.calls[1][0].dismissedSuggestions).toEqual({
      'evening-instagram': getLocalDateKey(new Date()),
    });
  });

  it('never presents the browser preview as active Android protection', () => {
    render(<TodayScreen state={state({ operatingSystem: 'web' })} updateState={vi.fn()} navigate={vi.fn()} />);

    expect(screen.getByText('Nur Vorschau – kein Android-Schutz')).toBeInTheDocument();
    expect(screen.getByText('1 App zum Schutz ausgewählt')).toBeInTheDocument();
    expect(screen.queryByText('Schutz aktiv')).not.toBeInTheDocument();
  });

  it('asks to protect an app when none is protected', () => {
    render(<TodayScreen state={state({ appsConfig: {} })} updateState={vi.fn()} navigate={vi.fn()} />);

    expect(screen.getByText('Kein Schutz aktiv')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'App schützen' })).toBeInTheDocument();
  });

  it('has no obvious accessibility violations', async () => {
    const { container } = render(<TodayScreen state={state()} updateState={vi.fn()} navigate={vi.fn()} />);
    await expectNoA11yViolations(container);
  });
});
