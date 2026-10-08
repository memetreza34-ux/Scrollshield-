import { useState } from 'react';
import { AppState, Screen, SUPPORTED_APPS } from '../types';
import { Choice, Header, Page, PrimaryButton, Section } from '../components/ui';
import { createFocusStartUpdate, getRunningFocusSession, minutesUntilClockTime } from '../lib/focus';
import { RunningSession } from './FocusScreens';

/**
 * Rescue (docs/V1_MASTER_PLAN.md, 4.6): an emergency brake, not a rules
 * engine. Locks every protected app at once and cannot be ended early.
 */
export function RescueScreen({
  state,
  updateState,
  navigate,
}: {
  state: AppState;
  updateState: (u: Partial<AppState>) => void;
  navigate: (s: Screen) => void;
}) {
  const [minutes, setMinutes] = useState(30);
  const running = getRunningFocusSession(state);
  const protectedApps = SUPPORTED_APPS.filter((app) => state.appsConfig[app.id]?.active);

  return (
    <Page>
      <Header title="Rescue" onBack={() => navigate('today')} />

      {running ? (
        <RunningSession state={state} updateState={updateState} navigate={navigate} />
      ) : (
        <>
          <p className="mb-8 text-lg leading-snug text-zinc-100">Ich muss mich jetzt konzentrieren.</p>
          <Section title="Wie lange?">
            <Choice<number>
              label="Dauer"
              value={minutes}
              onChange={setMinutes}
              options={[
                { value: 15, label: '15 Min.' },
                { value: 30, label: '30 Min.' },
                { value: 60, label: '60 Min.' },
                { value: minutesUntilClockTime(18, 0), label: 'Bis 18:00' },
                { value: minutesUntilClockTime(22, 0), label: 'Bis 22:00' },
              ]}
            />
          </Section>
          <p className="mb-6 text-sm text-zinc-400">
            {protectedApps.length} {protectedApps.length === 1 ? 'App wird' : 'Apps werden'} sofort gesperrt. Rescue
            lässt sich nicht vorzeitig beenden.
          </p>
          <PrimaryButton
            disabled={protectedApps.length === 0}
            onClick={() => updateState(createFocusStartUpdate(state, minutes, Date.now(), { kind: 'rescue' }))}
          >
            Rescue starten
          </PrimaryButton>
        </>
      )}
    </Page>
  );
}
