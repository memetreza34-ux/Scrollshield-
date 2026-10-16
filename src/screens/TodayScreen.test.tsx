import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '../test/a11y';
import { AppState, DEFAULT_APP_CONFIG, DEFAULT_STATE, HistoryEvent } from '../types';
import { TodayScreen } from './TodayScreen';
import { getLocalDateKey } from '../lib/appUtils';
import { setLanguage } from '../i18n';

afterEach(() => setLanguage('de'));

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

const android = (permissions: Partial<AppState['permissions']>): Partial<AppState> => ({
  operatingSystem: 'android',
  permissions: { ...DEFAULT_STATE.permissions, ...permissions },
});

describe('TodayScreen', () => {
  it("shows the day's interruptions on the timeline, and no estimated saved time", () => {
    render(
      <TodayScreen
        state={state({ history: [event('block', 1), event('warning', 2), event('open', 3)] })}
        updateState={vi.fn()}
        navigate={vi.fn()}
      />,
    );

    // The lock counts as "went back", the pause without a decision as "opened anyway".
    expect(
      screen.getByRole('img', { name: 'Bremsungen heute: 2, davon 1-mal zurück, 1-mal geöffnet.' }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/gespart/i)).toBeNull();
  });

  it('says plainly that it is quiet on the first day', () => {
    render(<TodayScreen state={state()} updateState={vi.fn()} navigate={vi.fn()} />);

    expect(screen.getByText('Noch keine Bremsung heute.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Deine Apps' })).toBeInTheDocument();
  });

  const usageToday = (instagram: number) => {
    const today = getLocalDateKey(new Date());
    return {
      ...android({ usageAccess: true, overlay: true }),
      dailyStats: {
        [today]: {
          date: today,
          usageMinutes: { instagram },
          blockedOpens: 0,
          savedTimeMinutes: 0,
          emergencyUnlocks: 0,
          focusMinutes: 0,
          screenTimeMinutes: 192,
        },
      },
    };
  };

  it('shows the daily goal with the measured minutes and the whole phone', () => {
    render(<TodayScreen state={state(usageToday(48))} updateState={vi.fn()} navigate={vi.fn()} />);

    expect(screen.getByRole('button', { name: /48 Min\. von 1 Std\. in geschützten Apps/ })).toBeInTheDocument();
    expect(screen.getByText('Noch 12 Min. im Ziel')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Bildschirmzeit' })).toBeInTheDocument();
    expect(screen.getByText('3 Std. 12 Min.')).toBeInTheDocument();
    expect(screen.getByText('Schutz aktiv')).toBeInTheDocument();
  });

  it('shows screen time like the system: per hour, most used apps and unlocks', () => {
    const base = usageToday(48);
    const today = getLocalDateKey(new Date());
    const stats = base.dailyStats[today];
    render(
      <TodayScreen
        state={state({
          ...base,
          dailyStats: {
            [today]: {
              ...stats,
              screenTimePerHour: Array.from({ length: 24 }, (_, hour) => (hour === 8 ? 40 : 0)),
              usagePerHour: Array.from({ length: 24 }, (_, hour) => (hour === 8 ? 20 : 0)),
              topApps: [
                { packageName: 'com.instagram.android', label: 'Instagram', minutes: 48 },
                { packageName: 'com.whatsapp', label: 'WhatsApp', minutes: 31 },
              ],
              unlocks: 54,
            },
          },
        })}
        updateState={vi.fn()}
        navigate={vi.fn()}
      />,
    );

    expect(screen.getByRole('img', { name: /Bildschirmzeit pro Stunde heute: 3 Std\. 12 Min\./ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Meistgenutzt' })).toBeInTheDocument();
    expect(screen.getByText('WhatsApp')).toBeInTheDocument();
    expect(screen.getByLabelText('geschützt')).toBeInTheDocument();
    expect(screen.getByText('54×')).toBeInTheDocument();
  });

  it('says plainly when the goal is passed, and lets the goal be changed', () => {
    const updateState = vi.fn();
    render(<TodayScreen state={state(usageToday(75))} updateState={updateState} navigate={vi.fn()} />);

    expect(screen.getByText('15 Min. über deinem Ziel')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Tagesziel ändern/ }));
    fireEvent.click(screen.getByText('1 Std. 30 Min.'));
    expect(updateState).toHaveBeenCalledWith({
      settings: expect.objectContaining({ dailyGoalMinutes: 90 }),
    });
  });

  it('says screen time is not measured instead of showing zero', () => {
    render(<TodayScreen state={state()} updateState={vi.fn()} navigate={vi.fn()} />);
    expect(screen.getByText(/Nicht gemessen/)).toBeInTheDocument();
  });

  it('says protection is off when both required permissions are missing', () => {
    const navigate = vi.fn();
    render(<TodayScreen state={state(android({}))} updateState={vi.fn()} navigate={navigate} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Schutz nicht aktiv');
    expect(screen.getByText('Schutz aus')).toBeInTheDocument();
    expect(screen.getByText('Nicht gemessen')).toBeInTheDocument();
    // The green button is "Berechtigungen erteilen", so "Fokus starten" steps back.
    fireEvent.click(screen.getByRole('button', { name: 'Berechtigungen erteilen' }));
    expect(navigate).toHaveBeenCalledWith('permissions');
  });

  it('names the one missing permission', () => {
    render(<TodayScreen state={state(android({ usageAccess: true }))} updateState={vi.fn()} navigate={vi.fn()} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Schutz eingeschränkt');
    expect(screen.getByText('1 Berechtigung fehlt: Über anderen Apps einblenden.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Beheben' })).toBeInTheDocument();
  });

  it('shows a running rescue and the lock on each app', () => {
    const startTime = Date.now() - 6 * 60_000;
    render(
      <TodayScreen
        state={state({
          history: [event('block', 1)],
          isFocusModeActive: true,
          focusSessions: [
            {
              id: 'rescue',
              startTime,
              endTime: null,
              duration: 30,
              successful: false,
              protectedApps: ['instagram'],
              blocksTriggered: 0,
              kind: 'rescue',
            },
          ],
        })}
        updateState={vi.fn()}
        navigate={vi.fn()}
      />,
    );

    expect(screen.getByText('Rescue läuft')).toBeInTheDocument();
    expect(screen.getByText(/^Gesperrt · Rescue bis \d\d:\d\d$/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Fokus starten/ })).not.toBeInTheDocument();
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

  it('asks to protect an app when none is protected', () => {
    render(<TodayScreen state={state({ appsConfig: {} })} updateState={vi.fn()} navigate={vi.fn()} />);

    expect(screen.getByText('Noch keine App geschützt.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'App schützen' })).toBeInTheDocument();
  });

  it('speaks English on an English phone', () => {
    setLanguage('en');
    render(<TodayScreen state={state({ history: [event('block', 1)] })} updateState={vi.fn()} navigate={vi.fn()} />);

    expect(
      screen.getByRole('img', { name: 'Slow-downs today: 1, went back 1 times, opened 0 times.' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Your apps' })).toBeInTheDocument();
  });

  it('has no obvious accessibility violations', async () => {
    const { container } = render(
      <TodayScreen state={state({ history: [event('block', 1)] })} updateState={vi.fn()} navigate={vi.fn()} />,
    );
    await expectNoA11yViolations(container);
  });
});
