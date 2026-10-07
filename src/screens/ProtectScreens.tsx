import { useState } from 'react';
import { AppConfig, AppState, Schedule, Screen, SUPPORTED_APPS } from '../types';
import {
  AppTile,
  Choice,
  Header,
  List,
  Page,
  PrimaryButton,
  Row,
  SecondaryButton,
  Section,
  Switch,
  TabHeader,
} from '../components/ui';
import { canAddSchedule, canProtectAnotherApp, hasPro, paywallFor, ProFeature } from '../lib/entitlements';
import {
  applyPreset,
  EIGENE_PRESET,
  getPresetId,
  getPresetLabel,
  NO_COOLDOWN,
  PRESET_STRENGTH,
  PRESETS,
  PresetId,
} from '../lib/presets';
import { createSchedule, formatScheduleRange } from '../lib/schedules';
import { formatUntil, isCommitmentActive } from '../lib/commitment';
import { minutesUntilClockTime } from '../lib/focus';
import { normalizeAppConfig } from '../lib/state';
import { getShortVideoSignature, V1_SHORT_VIDEO_APP_IDS } from '../lib/shortVideoSignatures';
import { FEATURE_FLAGS } from '../config/featureFlags';

type ScreenProps = {
  state: AppState;
  updateState: (u: Partial<AppState> | ((previous: AppState) => Partial<AppState>)) => void;
  navigate: (s: Screen) => void;
};

const showPaywall = (
  updateState: ScreenProps['updateState'],
  navigate: ScreenProps['navigate'],
  feature: ProFeature,
) => {
  updateState(paywallFor(feature));
  navigate('paywall');
};

const hourOptions = Array.from({ length: 24 }, (_, hour) => hour);

// ── Schutz (tab) ─────────────────────────────────────────────────────────────

export function ProtectScreen({ state, updateState, navigate }: ScreenProps) {
  const committed = isCommitmentActive(state);
  const protectedApps = SUPPORTED_APPS.filter((app) => state.appsConfig[app.id]?.active);
  const otherApps = SUPPORTED_APPS.filter((app) => !state.appsConfig[app.id]?.active);

  const setActive = (appId: string, active: boolean) => {
    if (active && !canProtectAnotherApp(state)) {
      showPaywall(updateState, navigate, 'third_app');
      return;
    }
    if (!active && committed) return;
    const config = normalizeAppConfig(appId, state.appsConfig[appId]);
    updateState({ appsConfig: { ...state.appsConfig, [appId]: { ...config, active } } });
  };

  const openApp = (appId: string) => {
    updateState({ selectedAppId: appId });
    navigate('app_detail');
  };

  const addSchedule = () => {
    if (!canAddSchedule(state)) {
      showPaywall(updateState, navigate, 'second_schedule');
      return;
    }
    const schedule = createSchedule(protectedApps.map((app) => app.id));
    updateState({ schedules: [...state.schedules, schedule], selectedScheduleId: schedule.id });
    navigate('schedule_edit');
  };

  const appRow = (app: (typeof SUPPORTED_APPS)[number]) => {
    const config = state.appsConfig[app.id];
    const active = config?.active ?? false;
    return (
      <Row
        key={app.id}
        leading={<AppTile app={app} size="sm" />}
        label={app.name}
        description={active && config ? getPresetLabel(getPresetId(config)) : undefined}
        onClick={() => openApp(app.id)}
        right={
          <Switch
            checked={active}
            onChange={(checked) => setActive(app.id, checked)}
            ariaLabel={`${app.name} schützen`}
          />
        }
      />
    );
  };

  return (
    <Page>
      <TabHeader title="Schutz" navigate={navigate} />

      {committed && state.commitment && (
        <p className="mb-6 rounded-xl border border-zinc-800 px-4 py-3 text-sm text-zinc-400">
          Selbstverpflichtung bis {formatUntil(state.commitment.until)}: Schutz lässt sich nur verstärken.
        </p>
      )}

      <Section title="Geschützte Apps">
        {protectedApps.length > 0 ? (
          <List>{protectedApps.map(appRow)}</List>
        ) : (
          <p className="px-1 text-sm text-zinc-500">Noch keine App geschützt.</p>
        )}
      </Section>

      <Section title="App schützen">
        <List>{otherApps.map(appRow)}</List>
        {!hasPro(state) && <p className="mt-2 px-1 text-sm text-zinc-500">Kostenlos: 2 Apps. Mit Pro unbegrenzt.</p>}
      </Section>

      <Section
        title="Zeitpläne"
        action={
          <button onClick={addSchedule} className="min-h-[44px] px-1 text-sm font-medium text-emerald-400">
            + Zeitplan
          </button>
        }
      >
        {state.schedules.length > 0 ? (
          <List>
            {state.schedules.map((schedule) => (
              <Row
                key={schedule.id}
                label={schedule.name}
                description={`${formatScheduleRange(schedule)} · ${schedule.appIds.length} ${schedule.appIds.length === 1 ? 'App' : 'Apps'} gesperrt`}
                onClick={() => {
                  updateState({ selectedScheduleId: schedule.id });
                  navigate('schedule_edit');
                }}
                right={
                  <Switch
                    checked={schedule.active}
                    onChange={(active) => {
                      if (!active && committed) return;
                      updateState({
                        schedules: state.schedules.map((entry) =>
                          entry.id === schedule.id ? { ...entry, active } : entry,
                        ),
                      });
                    }}
                    ariaLabel={`Zeitplan ${schedule.name}`}
                  />
                }
              />
            ))}
          </List>
        ) : (
          <p className="px-1 text-sm text-zinc-500">Zum Beispiel abends von 21 bis 7 Uhr alles sperren.</p>
        )}
      </Section>

      <Section title="Strenger Schutz">
        <List>
          <Row
            label="Selbstverpflichtung"
            description={
              committed && state.commitment
                ? `Aktiv bis ${formatUntil(state.commitment.until)}`
                : 'Für eine Zeit lässt sich der Schutz nicht lockern.'
            }
            pro={!hasPro(state)}
            onClick={() => (hasPro(state) ? navigate('commitment') : showPaywall(updateState, navigate, 'commitment'))}
          />
        </List>
      </Section>
    </Page>
  );
}

// ── App-Detail ───────────────────────────────────────────────────────────────

type RuleId = 'delay' | 'reopen' | 'feed' | 'session' | 'budget' | 'emergency';

const reopenLevel = (config: AppConfig): 'off' | 'basic' | 'cooldown' => {
  if (!config.antiBinge.enabled) return 'off';
  return config.antiBinge.blockThreshold >= NO_COOLDOWN ? 'basic' : 'cooldown';
};

const REOPEN_LABELS = { off: 'Aus', basic: 'Erneute Pause', cooldown: 'Mit Abkühlzeit' } as const;

const feedLabel = (config: AppConfig) => {
  const feed = config.reelsProtection;
  if (!feed.enabled || feed.mode === 'allow') return 'Aus';
  if (feed.mode === 'block' || feed.dailyLimitMinutes === 0) return 'Gesperrt';
  return `${feed.dailyLimitMinutes} Min. pro Tag`;
};

const minutesLabel = (minutes: number | undefined) => (minutes && minutes > 0 ? `${minutes} Min.` : 'Aus');

export function AppDetailScreen({ state, updateState, navigate }: ScreenProps) {
  const [openRule, setOpenRule] = useState<RuleId | null>(null);
  const app = SUPPORTED_APPS.find((candidate) => candidate.id === state.selectedAppId);
  if (!app) return null;

  const config = normalizeAppConfig(app.id, state.appsConfig[app.id]);
  const pro = hasPro(state);
  const committed = isCommitmentActive(state);
  const presetId = getPresetId(config);
  const hasFeed =
    FEATURE_FLAGS.enableShortVideoResearch &&
    !!app.shortVideoSurface &&
    V1_SHORT_VIDEO_APP_IDS.includes(app.id) &&
    !!getShortVideoSignature(app.id);
  const schedules = state.schedules.filter((schedule) => schedule.appIds.includes(app.id));

  const save = (next: AppConfig) => updateState({ appsConfig: { ...state.appsConfig, [app.id]: next } });
  /** A hand-made change turns the preset into "Eigene"; only Pro may do that. */
  const saveCustom = (patch: Partial<AppConfig>, feature: ProFeature = 'preset_eigene') => {
    if (!pro) {
      showPaywall(updateState, navigate, feature);
      return;
    }
    if (committed) return;
    save({ ...config, ...patch, preset: 'eigene' });
  };

  const choosePreset = (id: PresetId) => {
    const definition = id === 'eigene' ? EIGENE_PRESET : PRESETS.find((preset) => preset.id === id);
    if (definition?.pro && !pro) {
      showPaywall(updateState, navigate, id === 'stark' ? 'preset_stark' : 'preset_eigene');
      return;
    }
    if (committed && PRESET_STRENGTH[id] < PRESET_STRENGTH[presetId]) return;
    save(applyPreset(config, id));
  };

  const toggle = (rule: RuleId) => setOpenRule(openRule === rule ? null : rule);

  const ruleRow = (rule: RuleId, label: string, value: string, options: { pro?: boolean } = {}) => (
    <Row
      label={label}
      value={value}
      pro={options.pro && !pro}
      onClick={() => toggle(rule)}
      trailing={
        <span className="w-4 text-zinc-500" aria-hidden="true">
          {openRule === rule ? '–' : '+'}
        </span>
      }
    />
  );

  const editor = (children: React.ReactNode, note?: string) => (
    <div className="space-y-3 bg-zinc-950/60 px-4 py-4">
      {children}
      {note && <p className="text-sm text-zinc-500">{note}</p>}
    </div>
  );

  return (
    <Page>
      <Header title={app.name} onBack={() => navigate('protect')} />

      <div className="mb-8 flex items-center gap-4 rounded-2xl bg-zinc-900 p-4">
        <AppTile app={app} size="md" />
        <span className="flex-1">
          <span className="block font-semibold text-zinc-100">Schutz {config.active ? 'an' : 'aus'}</span>
          <span className="block text-sm text-zinc-500">{getPresetLabel(presetId)}</span>
        </span>
        <Switch
          checked={config.active}
          ariaLabel={`${app.name} schützen`}
          onChange={(active) => {
            if (active && !canProtectAnotherApp(state)) {
              showPaywall(updateState, navigate, 'third_app');
              return;
            }
            if (!active && committed) return;
            save({ ...config, active });
          }}
        />
      </div>

      {committed && (
        <p className="mb-6 rounded-xl border border-zinc-800 px-4 py-3 text-sm text-zinc-400">
          Selbstverpflichtung aktiv: Du kannst den Schutz nur verstärken.
        </p>
      )}

      <Section title="Voreinstellung">
        <Choice<PresetId>
          label="Voreinstellung"
          value={presetId}
          onChange={choosePreset}
          options={[
            ...PRESETS.map((preset) => ({
              value: preset.id as PresetId,
              label: preset.label,
              pro: preset.pro && !pro,
            })),
            { value: 'eigene' as PresetId, label: EIGENE_PRESET.label, pro: !pro },
          ]}
        />
        <p className="mt-3 px-1 text-sm text-zinc-500">
          {presetId === 'eigene' ? EIGENE_PRESET.summary : PRESETS.find((preset) => preset.id === presetId)?.summary}
        </p>
      </Section>

      <Section title="Regeln">
        <List>
          {ruleRow('delay', 'Öffnen', `${config.openDelay} s Pause`)}
          {openRule === 'delay' &&
            editor(
              <Choice<number>
                label="Pause beim Öffnen"
                value={config.openDelay}
                onChange={(openDelay) => saveCustom({ openDelay })}
                options={[3, 5, 10, 15, 30].map((seconds) => ({ value: seconds, label: `${seconds} s`, pro: !pro }))}
              />,
              'So lange wartest du, bevor „Weiter“ möglich ist.',
            )}

          {ruleRow('reopen', 'Wiederholtes Öffnen', REOPEN_LABELS[reopenLevel(config)])}
          {openRule === 'reopen' &&
            editor(
              <Choice<'off' | 'basic' | 'cooldown'>
                label="Wiederholtes Öffnen"
                value={reopenLevel(config)}
                onChange={(level) =>
                  saveCustom({
                    antiBinge: {
                      ...config.antiBinge,
                      enabled: level !== 'off',
                      warningThreshold: 1,
                      warningTimeframe: 10,
                      blockThreshold: level === 'cooldown' ? 3 : NO_COOLDOWN,
                      blockTimeframe: 30,
                    },
                  })
                }
                options={[
                  { value: 'off', label: 'Aus', pro: !pro },
                  { value: 'basic', label: 'Erneute Pause', pro: !pro },
                  { value: 'cooldown', label: 'Mit Abkühlzeit', pro: !pro },
                ]}
              />,
              'Erneute Pause: wer innerhalb von 10 Minuten wieder öffnet, wird erneut unterbrochen. Abkühlzeit: beim dritten Öffnen in 30 Minuten bleibt die App gesperrt, bis die erste Öffnung 30 Minuten her ist.',
            )}

          {hasFeed && ruleRow('feed', app.shortVideoSurface?.name ?? 'Kurzvideos', feedLabel(config))}
          {hasFeed &&
            openRule === 'feed' &&
            editor(
              <>
                <Choice<string>
                  label="Kurzvideo-Schutz"
                  value={feedLabel(config)}
                  onChange={(choice) => {
                    if (committed) return;
                    const feed = config.reelsProtection;
                    const next =
                      choice === 'Aus'
                        ? { ...feed, enabled: false }
                        : choice === 'Gesperrt'
                          ? { ...feed, enabled: true, mode: 'block' as const }
                          : {
                              ...feed,
                              enabled: true,
                              mode: 'limit' as const,
                              dailyLimitMinutes: Number.parseInt(choice, 10),
                            };
                    save({ ...config, reelsProtection: next });
                  }}
                  options={['Aus', 'Gesperrt', '10 Min. pro Tag', '15 Min. pro Tag', '30 Min. pro Tag'].map(
                    (label) => ({
                      value: label,
                      label,
                    }),
                  )}
                />
                <p className="text-sm font-medium text-zinc-300">Wisch-Unterbrecher</p>
                <Choice<number>
                  label="Wisch-Unterbrecher"
                  value={config.reelsProtection.stopAfterSwipes ?? 0}
                  onChange={(stopAfterSwipes) =>
                    saveCustom({ reelsProtection: { ...config.reelsProtection, stopAfterSwipes } }, 'feed_extras')
                  }
                  options={[0, 10, 20, 30].map((swipes) => ({
                    value: swipes,
                    label: swipes === 0 ? 'Aus' : `nach ${swipes}`,
                    pro: !pro,
                  }))}
                />
              </>,
              `Nur der ${app.shortVideoSurface?.name ?? 'Kurzvideo'}-Bereich wird gebremst, der Rest von ${app.name} bleibt frei. Braucht die Bedienungshilfe.${state.operatingSystem !== 'web' && !state.permissions.accessibility ? ' Sie ist noch nicht aktiv.' : ''}`,
            )}

          {ruleRow('session', 'Sitzungs-Wächter', minutesLabel(config.sessionLimit), { pro: true })}
          {openRule === 'session' &&
            editor(
              <Choice<number>
                label="Sitzungs-Wächter"
                value={config.sessionLimit ?? 0}
                onChange={(sessionLimit) => saveCustom({ sessionLimit }, 'session_guard')}
                options={[0, 5, 10, 15, 30].map((minutes) => ({
                  value: minutes,
                  label: minutesLabel(minutes),
                  pro: !pro,
                }))}
              />,
              'Nach so vielen Minuten am Stück fragt ScrollShield: weiter oder Schluss?',
            )}

          {ruleRow('budget', 'Tagesbudget', minutesLabel(config.dailyLimit), { pro: true })}
          {openRule === 'budget' &&
            editor(
              <Choice<number>
                label="Tagesbudget"
                value={config.dailyLimit}
                onChange={(dailyLimit) => saveCustom({ dailyLimit }, 'daily_budget')}
                options={[0, 15, 30, 60, 90].map((minutes) => ({
                  value: minutes,
                  label: minutesLabel(minutes),
                  pro: !pro,
                }))}
              />,
              'Ist das Budget aufgebraucht, bleibt die App bis Mitternacht gesperrt.',
            )}

          <Row
            label="Zeitplan"
            value={schedules.length > 0 ? schedules.map((schedule) => schedule.name).join(', ') : 'Keiner'}
            onClick={() => navigate('protect')}
          />

          {ruleRow(
            'emergency',
            'Notfallfreigabe',
            committed
              ? 'Gesperrt'
              : config.emergencyUnlock.enabled
                ? `${config.emergencyUnlock.maxPerDay}× am Tag`
                : 'Aus',
          )}
          {openRule === 'emergency' &&
            editor(
              <Row
                label="Notfallfreigabe erlauben"
                right={
                  <Switch
                    checked={config.emergencyUnlock.enabled}
                    ariaLabel="Notfallfreigabe erlauben"
                    onChange={(enabled) => {
                      if (committed && enabled) return;
                      save({ ...config, emergencyUnlock: { ...config.emergencyUnlock, enabled } });
                    }}
                  />
                }
              />,
              `Ist die App gesperrt, kannst du sie ${config.emergencyUnlock.maxPerDay}× am Tag für ${config.emergencyUnlock.durationMinutes} Minuten freigeben – nach 10 Sekunden Wartezeit und mit Grund. Nicht während Selbstverpflichtung oder strengem Fokus.`,
            )}
        </List>
      </Section>
    </Page>
  );
}

// ── Zeitplan bearbeiten ─────────────────────────────────────────────────────

export function ScheduleEditScreen({ state, updateState, navigate }: ScreenProps) {
  const schedule = state.schedules.find((entry) => entry.id === state.selectedScheduleId);
  if (!schedule) return null;
  const committed = isCommitmentActive(state);
  const protectedApps = SUPPORTED_APPS.filter((app) => state.appsConfig[app.id]?.active);

  const change = (patch: Partial<Schedule>) =>
    updateState((previous) => ({
      schedules: previous.schedules.map((entry) => (entry.id === schedule.id ? { ...entry, ...patch } : entry)),
    }));

  const hourSelect = (label: string, value: number, onChange: (hour: number) => void) => (
    <label className="flex flex-1 flex-col gap-1 text-sm text-zinc-400">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="min-h-[48px] rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-base text-zinc-100"
      >
        {hourOptions.map((hour) => (
          <option key={hour} value={hour}>
            {hour.toString().padStart(2, '0')}:00
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <Page>
      <Header title="Zeitplan" onBack={() => navigate('protect')} />

      <Section title="Name">
        <input
          value={schedule.name}
          onChange={(event) => change({ name: event.target.value })}
          aria-label="Name des Zeitplans"
          className="min-h-[48px] w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-base text-zinc-100"
        />
      </Section>

      <Section title="Zeitraum, jeden Tag">
        <div className="flex gap-3">
          {hourSelect('Von', schedule.startHour, (startHour) => change({ startHour }))}
          {hourSelect('Bis', schedule.endHour, (endHour) => change({ endHour }))}
        </div>
        {schedule.startHour === schedule.endHour && (
          <p className="mt-2 px-1 text-sm text-amber-400">Start und Ende sind gleich – der Zeitplan greift nie.</p>
        )}
      </Section>

      <Section title="Diese Apps sind in der Zeit gesperrt">
        {protectedApps.length > 0 ? (
          <List>
            {protectedApps.map((app) => {
              const included = schedule.appIds.includes(app.id);
              return (
                <Row
                  key={app.id}
                  leading={<AppTile app={app} size="sm" />}
                  label={app.name}
                  right={
                    <Switch
                      checked={included}
                      ariaLabel={`${app.name} im Zeitplan`}
                      onChange={(checked) => {
                        if (!checked && committed) return;
                        change({
                          appIds: checked
                            ? [...schedule.appIds, app.id]
                            : schedule.appIds.filter((id) => id !== app.id),
                        });
                      }}
                    />
                  }
                />
              );
            })}
          </List>
        ) : (
          <p className="px-1 text-sm text-zinc-500">Schütze zuerst eine App.</p>
        )}
      </Section>

      <Section>
        <List>
          <Row
            label="Zeitplan aktiv"
            right={
              <Switch
                checked={schedule.active}
                ariaLabel="Zeitplan aktiv"
                onChange={(active) => {
                  if (!active && committed) return;
                  change({ active });
                }}
              />
            }
          />
        </List>
      </Section>

      <SecondaryButton
        disabled={committed}
        onClick={() => {
          updateState((previous) => ({
            schedules: previous.schedules.filter((entry) => entry.id !== schedule.id),
            selectedScheduleId: null,
          }));
          navigate('protect');
        }}
      >
        Zeitplan löschen
      </SecondaryButton>
    </Page>
  );
}

// ── Selbstverpflichtung ─────────────────────────────────────────────────────

export function CommitmentScreen({ state, updateState, navigate }: ScreenProps) {
  const [minutes, setMinutes] = useState(minutesUntilClockTime(7, 0));
  const [confirming, setConfirming] = useState(false);
  const active = isCommitmentActive(state);

  const options = [
    { value: 60, label: '1 Stunde' },
    { value: 240, label: '4 Stunden' },
    { value: minutesUntilClockTime(7, 0), label: 'Bis 07:00' },
    { value: 1440, label: '24 Stunden' },
  ];

  return (
    <Page>
      <Header title="Selbstverpflichtung" onBack={() => navigate('protect')} />

      {active && state.commitment ? (
        <>
          <p className="mb-2 text-lg font-semibold text-zinc-100">Aktiv bis {formatUntil(state.commitment.until)}</p>
          <p className="text-sm text-zinc-400">
            Bis dahin lässt sich der Schutz nur verstärken. Eine Selbstverpflichtung lässt sich nicht vorzeitig beenden.
          </p>
        </>
      ) : (
        <>
          <p className="mb-6 text-sm leading-relaxed text-zinc-400">
            Für die gewählte Zeit kannst du keine App ausschalten, keine Voreinstellung lockern, keinen Zeitplan
            pausieren und keine Notfallfreigabe nutzen. Verstärken geht immer.
          </p>
          <Section title="Dauer">
            <Choice<number> label="Dauer" value={minutes} onChange={setMinutes} options={options} />
          </Section>
          {confirming ? (
            <div className="space-y-3">
              <p className="text-sm text-zinc-300">
                Bis {formatUntil(Date.now() + minutes * 60_000)} kannst du das nicht rückgängig machen.
              </p>
              <PrimaryButton
                onClick={() => {
                  updateState({ commitment: { until: Date.now() + minutes * 60_000 } });
                  navigate('protect');
                }}
              >
                Verbindlich starten
              </PrimaryButton>
              <SecondaryButton onClick={() => setConfirming(false)}>Abbrechen</SecondaryButton>
            </div>
          ) : (
            <PrimaryButton onClick={() => setConfirming(true)}>Weiter</PrimaryButton>
          )}
        </>
      )}
    </Page>
  );
}
