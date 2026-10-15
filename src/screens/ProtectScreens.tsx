import { useState } from 'react';
import { CalendarClock, ChevronDown, Info, LockKeyhole, Moon, Plus, Shield, TriangleAlert } from 'lucide-react';
import { AppConfig, AppState, PlatformDefinition, Schedule, Screen, SUPPORTED_APPS } from '../types';
import {
  AppTile,
  Choice,
  EmptyState,
  Header,
  InlineButton,
  List,
  Notice,
  OptionList,
  Page,
  PrimaryButton,
  ProBadge,
  Row,
  SecondaryButton,
  Section,
  Sheet,
  Switch,
  TabHeader,
  TextButton,
} from '../components/ui';
import { FOCUS_RING_INSET, PRESSED } from '../components/styles';
import { AccessibilityDisclosure } from '../components/AccessibilityDisclosure';
import { MessageKey, t } from '../i18n';
import { canAddSchedule, canProtectAnotherApp, FREE_LIMITS, hasPro, paywallFor, ProFeature } from '../lib/entitlements';
import {
  applyPreset,
  getPresetId,
  getPresetLabel,
  getPresetSummary,
  NO_COOLDOWN,
  PRESET_STRENGTH,
  PRESETS,
  PresetId,
} from '../lib/presets';
import { createSchedule, formatScheduleRange } from '../lib/schedules';
import { formatUntil, isCommitmentActive } from '../lib/commitment';
import { minutesUntilClockTime } from '../lib/focus';
import { getDayMetrics } from '../lib/metrics';
import { formatHour, formatMinutes } from '../lib/format';
import { ScrollShieldBridge } from '../lib/nativeBridge';
import { normalizeAppConfig } from '../lib/state';
import { getShortVideoSignature, V1_SHORT_VIDEO_APP_IDS } from '../lib/shortVideoSignatures';
import { usePermissionRequests } from '../lib/usePermissionRequests';

type ScreenProps = {
  state: AppState;
  updateState: (u: Partial<AppState> | ((previous: AppState) => Partial<AppState>)) => void;
  navigate: (s: Screen) => void;
};

const CARD = 'rounded-surface border border-line bg-surface';

const showPaywall = (
  updateState: ScreenProps['updateState'],
  navigate: ScreenProps['navigate'],
  feature: ProFeature,
) => {
  updateState(paywallFor(feature));
  navigate('paywall');
};

/** Short-video protection only where detection was checked on real devices (docs/V1_MASTER_PLAN.md, 6). */
const hasFeedRule = (app: PlatformDefinition) =>
  !!app.shortVideoSurface && V1_SHORT_VIDEO_APP_IDS.includes(app.id) && !!getShortVideoSignature(app.id);

/** "Reels", "Shorts", "Feed": the last word of the surface name. */
const surfaceWord = (app: PlatformDefinition) => app.shortVideoSurface?.name.split(' ').at(-1) ?? '';

type FeedMode = 'off' | 'limit' | 'block';

const feedMode = (config: AppConfig): FeedMode => {
  const feed = config.reelsProtection;
  if (!feed.enabled || feed.mode === 'allow' || feed.mode === 'warn') return 'off';
  if (feed.mode === 'block' || feed.dailyLimitMinutes === 0) return 'block';
  return 'limit';
};

/** "15 Min. pro Tag", "Gesperrt" or "Aus". */
const feedValue = (config: AppConfig) => {
  const mode = feedMode(config);
  if (mode === 'off') return t('common.off');
  if (mode === 'block') return t('protect.feed.blocked');
  return t('protect.feed.perDay', { minutes: config.reelsProtection.dailyLimitMinutes });
};

const minutesValue = (minutes: number | undefined) =>
  minutes && minutes > 0 ? formatMinutes(minutes) : t('common.off');

/** A tile-sized icon in front of a row, so rows without an app tile line up with those with one. */
const RowIcon = ({ icon: Icon }: { icon: typeof Plus }) => (
  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center" aria-hidden="true">
    <Icon size={24} strokeWidth={1.75} className="text-ink" />
  </span>
);

// ── Schutz (tab) ─────────────────────────────────────────────────────────────

export function ProtectScreen({ state, updateState, navigate }: ScreenProps) {
  const [picking, setPicking] = useState(false);
  const committed = isCommitmentActive(state);
  const pro = hasPro(state);
  const protectedApps = SUPPORTED_APPS.filter((app) => state.appsConfig[app.id]?.active);
  const otherApps = SUPPORTED_APPS.filter((app) => !state.appsConfig[app.id]?.active);
  const canAddApp = canProtectAnotherApp(state);

  const setActive = (appId: string, active: boolean) => {
    if (active && !canProtectAnotherApp(state)) {
      showPaywall(updateState, navigate, 'third_app');
      return;
    }
    if (!active && committed) return;
    const config = normalizeAppConfig(appId, state.appsConfig[appId]);
    updateState({ appsConfig: { ...state.appsConfig, [appId]: { ...config, active } } });
  };

  const pickApp = () => {
    if (!canAddApp) showPaywall(updateState, navigate, 'third_app');
    else setPicking(!picking);
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

  const describe = (app: PlatformDefinition) => {
    const config = normalizeAppConfig(app.id, state.appsConfig[app.id]);
    const preset = getPresetLabel(getPresetId(config));
    return hasFeedRule(app) && feedMode(config) !== 'off'
      ? `${preset} · ${surfaceWord(app)} ${feedMode(config) === 'block' ? t('protect.feed.blockedShort') : formatMinutes(config.reelsProtection.dailyLimitMinutes)}`
      : preset;
  };

  const switchFor = (app: PlatformDefinition, checked: boolean) => (
    <Switch
      checked={checked}
      onChange={(next) => setActive(app.id, next)}
      ariaLabel={t('protect.protectApp', { app: app.name })}
    />
  );

  const picker = (
    <div className="mt-3">
      <List>
        {otherApps.map((app) => (
          <Row key={app.id} leading={<AppTile app={app} />} label={app.name} strong right={switchFor(app, false)} />
        ))}
      </List>
    </div>
  );

  return (
    <Page>
      <TabHeader title={t('nav.protect')} navigate={navigate} />

      {committed && state.commitment && (
        <div className="mb-4">
          <Notice icon={LockKeyhole}>{t('protect.committed', { until: formatUntil(state.commitment.until) })}</Notice>
        </div>
      )}

      <Section
        title={t('protect.apps')}
        kind="title"
        action={
          !pro && (
            <span className="text-label-s text-muted">
              {t('protect.countOf', { count: protectedApps.length, limit: FREE_LIMITS.protectedApps })}
            </span>
          )
        }
      >
        {protectedApps.length === 0 ? (
          <>
            <EmptyState
              icon={Shield}
              title={t('today.noApps.title')}
              text={t('today.noApps.text')}
              action={<PrimaryButton onClick={() => setPicking(!picking)}>{t('today.noApps.action')}</PrimaryButton>}
            />
            {picking && picker}
          </>
        ) : (
          <>
            <List>
              {protectedApps.map((app) => (
                <Row
                  key={app.id}
                  leading={<AppTile app={app} />}
                  label={app.name}
                  strong
                  description={describe(app)}
                  onClick={() => openApp(app.id)}
                  right={switchFor(app, true)}
                />
              ))}
              {otherApps.length > 0 && (
                <Row
                  leading={<RowIcon icon={Plus} />}
                  label={t('protect.addApp')}
                  pro={!canAddApp}
                  onClick={pickApp}
                  noChevron
                />
              )}
            </List>
            {picking && canAddApp && picker}
          </>
        )}
      </Section>

      <Section title={t('protect.schedules')} kind="title">
        {state.schedules.length > 0 ? (
          <List>
            {state.schedules.map((schedule) => (
              <Row
                key={schedule.id}
                leading={<RowIcon icon={Moon} />}
                label={schedule.name}
                strong
                description={
                  schedule.active
                    ? t('protect.schedule.summary', { range: formatScheduleRange(schedule) })
                    : t('protect.schedule.paused', { range: formatScheduleRange(schedule) })
                }
                onClick={() => {
                  updateState({ selectedScheduleId: schedule.id });
                  navigate('schedule_edit');
                }}
              />
            ))}
            <Row
              leading={<RowIcon icon={Plus} />}
              label={t('protect.schedule.add')}
              pro={!canAddSchedule(state)}
              onClick={addSchedule}
              noChevron
            />
          </List>
        ) : (
          <div className={`flex flex-col gap-3 p-4 ${CARD}`}>
            <p className="text-body-s text-muted">{t('protect.schedule.empty')}</p>
            <SecondaryButton onClick={addSchedule}>{t('protect.schedule.create')}</SecondaryButton>
          </div>
        )}
      </Section>

      <Section title={t('protect.commitment')} kind="title" action={!pro && <ProBadge />}>
        <div className={`flex flex-col gap-3 p-4 ${CARD}`}>
          <p className="text-body-s text-muted">
            {committed && state.commitment
              ? t('protect.commitment.active', { until: formatUntil(state.commitment.until) })
              : t('protect.commitment.text')}
          </p>
          <div>
            <InlineButton
              onClick={() => (pro ? navigate('commitment') : showPaywall(updateState, navigate, 'commitment'))}
            >
              {t('protect.commitment.more')}
            </InlineButton>
          </div>
        </div>
      </Section>
    </Page>
  );
}

// ── App-Detail ───────────────────────────────────────────────────────────────

type RuleId = 'delay' | 'reopen' | 'feed' | 'session' | 'budget' | 'emergency';
type ReopenLevel = 'off' | 'basic' | 'cooldown';

const reopenLevel = (config: AppConfig): ReopenLevel => {
  if (!config.antiBinge.enabled) return 'off';
  return config.antiBinge.blockThreshold >= NO_COOLDOWN ? 'basic' : 'cooldown';
};

const REOPEN_LABELS: Record<ReopenLevel, MessageKey> = {
  off: 'common.off',
  basic: 'protect.reopen.basic',
  cooldown: 'protect.reopen.cooldown',
};

export function AppDetailScreen({ state, updateState, navigate }: ScreenProps) {
  const [openRule, setOpenRule] = useState<RuleId | null>(null);
  const [disclosure, setDisclosure] = useState(false);
  // Picks up the accessibility service when the user comes back from Android's settings.
  usePermissionRequests(updateState);
  const app = SUPPORTED_APPS.find((candidate) => candidate.id === state.selectedAppId);
  if (!app) return null;

  const config = normalizeAppConfig(app.id, state.appsConfig[app.id]);
  const pro = hasPro(state);
  const committed = isCommitmentActive(state);
  const presetId = getPresetId(config);
  const hasFeed = hasFeedRule(app);
  const surface = surfaceWord(app);
  const schedules = state.schedules.filter((schedule) => schedule.appIds.includes(app.id));
  const accessibilityMissing = state.operatingSystem === 'android' && !state.permissions.accessibility;
  const today = getDayMetrics(state).perApp.find((entry) => entry.appId === app.id);

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
    const isPro = id === 'eigene' || PRESETS.find((preset) => preset.id === id)?.pro;
    if (isPro && !pro) {
      showPaywall(updateState, navigate, id === 'stark' ? 'preset_stark' : 'preset_eigene');
      return;
    }
    if (committed && PRESET_STRENGTH[id] < PRESET_STRENGTH[presetId]) return;
    save(applyPreset(config, id));
  };

  const chooseFeed = (mode: FeedMode) => {
    if (committed) return;
    const feed = config.reelsProtection;
    const next =
      mode === 'off'
        ? { ...feed, enabled: false }
        : mode === 'block'
          ? { ...feed, enabled: true, mode: 'block' as const }
          : { ...feed, enabled: true, mode: 'limit' as const, dailyLimitMinutes: feed.dailyLimitMinutes || 15 };
    save({ ...config, reelsProtection: next });
    // Google wants the disclosure right where the feature that needs the service is switched on.
    if (mode !== 'off' && accessibilityMissing) setDisclosure(true);
  };

  const ruleRow = (rule: RuleId, label: string, value: string, options: { pro?: boolean } = {}) => (
    <Row
      label={label}
      value={value}
      pro={options.pro && !pro}
      onClick={() => setOpenRule(openRule === rule ? null : rule)}
      trailing={
        <ChevronDown
          size={20}
          strokeWidth={1.75}
          className={`flex-shrink-0 text-muted transition-transform duration-150 ${openRule === rule ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      }
    />
  );

  const editor = (children: React.ReactNode, note?: string) => (
    <div className="flex flex-col gap-3 bg-ground/40 px-4 py-4">
      {children}
      {note && <p className="text-body-s text-muted">{note}</p>}
    </div>
  );

  const todayLine =
    today && today.opens + today.interruptions > 0
      ? t('protect.detail.today', {
          summary: [
            today.usageMinutes !== null ? formatMinutes(today.usageMinutes) : null,
            today.opens === 1 ? t('today.app.opensOne') : t('today.app.opensMany', { count: today.opens }),
          ]
            .filter(Boolean)
            .join(' · '),
        })
      : t('today.app.notOpened');

  return (
    <Page>
      {disclosure && (
        <AccessibilityDisclosure
          onAccept={() => {
            setDisclosure(false);
            void ScrollShieldBridge.openAccessibilitySettings().catch(() => undefined);
          }}
          onDecline={() => setDisclosure(false)}
        />
      )}

      <Header title={app.name} onBack={() => navigate('protect')} />

      <div className={`mb-6 overflow-hidden ${CARD}`}>
        <div className="flex items-center gap-4 border-b border-line p-4">
          <AppTile app={app} />
          <div className="min-w-0">
            <p className="text-title-s text-ink">{app.name}</p>
            <p className="text-body-s text-muted">{todayLine}</p>
          </div>
        </div>
        <Row
          label={t('protect.detail.on')}
          right={
            <Switch
              checked={config.active}
              ariaLabel={t('protect.protectApp', { app: app.name })}
              onChange={(active) => {
                if (active && !canProtectAnotherApp(state)) {
                  showPaywall(updateState, navigate, 'third_app');
                  return;
                }
                if (!active && committed) return;
                save({ ...config, active });
              }}
            />
          }
        />
      </div>

      {committed && (
        <div className="mb-6">
          <Notice icon={LockKeyhole}>{t('protect.detail.committed')}</Notice>
        </div>
      )}

      <Section title={t('protect.detail.preset')} kind="title">
        <OptionList<PresetId>
          label={t('protect.detail.preset')}
          value={presetId}
          onChange={choosePreset}
          options={(['sanft', 'ausgewogen', 'stark', 'eigene'] as PresetId[]).map((id) => ({
            value: id,
            label: getPresetLabel(id),
            description: getPresetSummary(id),
            tag: id === 'ausgewogen' ? t('protect.detail.default') : undefined,
            pro: (id === 'stark' || id === 'eigene') && !pro,
          }))}
        />
      </Section>

      <Section title={t('protect.detail.rules')} kind="title">
        <List>
          {ruleRow('delay', t('protect.rule.delay'), t('protect.rule.delayValue', { seconds: config.openDelay }))}
          {openRule === 'delay' &&
            editor(
              <Choice<number>
                label={t('protect.rule.delay')}
                value={config.openDelay}
                onChange={(openDelay) => saveCustom({ openDelay })}
                options={[3, 5, 10, 15, 30].map((seconds) => ({ value: seconds, label: `${seconds} s`, pro: !pro }))}
              />,
              t('protect.rule.delayNote'),
            )}

          {ruleRow('reopen', t('protect.rule.reopen'), t(REOPEN_LABELS[reopenLevel(config)]))}
          {openRule === 'reopen' &&
            editor(
              <OptionList<ReopenLevel>
                label={t('protect.rule.reopen')}
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
                options={(['off', 'basic', 'cooldown'] as ReopenLevel[]).map((level) => ({
                  value: level,
                  label: t(REOPEN_LABELS[level]),
                  description:
                    level === 'off'
                      ? undefined
                      : t(level === 'basic' ? 'protect.reopen.basicText' : 'protect.reopen.cooldownText'),
                  pro: !pro,
                }))}
              />,
            )}

          {hasFeed && ruleRow('feed', surface, feedValue(config))}
          {hasFeed &&
            openRule === 'feed' &&
            editor(
              <>
                {accessibilityMissing && feedMode(config) !== 'off' && (
                  <Notice
                    tone="pause"
                    icon={TriangleAlert}
                    title={t('protect.feed.serviceOff')}
                    action={<InlineButton onClick={() => setDisclosure(true)}>{t('common.turnOn')}</InlineButton>}
                  >
                    {t('protect.feed.serviceOffText', { surface })}
                  </Notice>
                )}
                <OptionList<FeedMode>
                  label={surface}
                  value={feedMode(config)}
                  onChange={chooseFeed}
                  options={[
                    { value: 'off', label: t('common.off'), description: t('protect.feed.offText', { surface }) },
                    {
                      value: 'limit',
                      label: t('protect.feed.limit'),
                      description: t('protect.feed.limitText'),
                    },
                    {
                      value: 'block',
                      label: t('protect.feed.blocked'),
                      description: t('protect.feed.blockText'),
                    },
                  ]}
                />
                {feedMode(config) === 'limit' && (
                  <>
                    <p className="text-label-s text-muted">{t('protect.feed.perDayTitle')}</p>
                    <Choice<number>
                      label={t('protect.feed.perDayTitle')}
                      value={config.reelsProtection.dailyLimitMinutes}
                      onChange={(dailyLimitMinutes) => {
                        if (committed && dailyLimitMinutes > config.reelsProtection.dailyLimitMinutes) return;
                        save({ ...config, reelsProtection: { ...config.reelsProtection, dailyLimitMinutes } });
                      }}
                      options={[10, 15, 30].map((minutes) => ({ value: minutes, label: formatMinutes(minutes) }))}
                    />
                  </>
                )}
                <p className="flex items-center gap-2 text-label-s text-muted">
                  {t('protect.feed.swipes')}
                  {!pro && <ProBadge />}
                </p>
                <Choice<number>
                  label={t('protect.feed.swipes')}
                  value={config.reelsProtection.stopAfterSwipes ?? 0}
                  onChange={(stopAfterSwipes) =>
                    saveCustom({ reelsProtection: { ...config.reelsProtection, stopAfterSwipes } }, 'feed_extras')
                  }
                  options={[0, 10, 20, 30].map((swipes) => ({
                    value: swipes,
                    label: swipes === 0 ? t('common.off') : t('protect.feed.afterSwipes', { swipes }),
                  }))}
                />
                <p className="flex items-start gap-2 text-body-s text-muted">
                  <Info size={16} strokeWidth={2} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
                  {t('protect.feed.honesty')}
                </p>
              </>,
            )}

          {ruleRow('session', t('protect.rule.session'), minutesValue(config.sessionLimit), { pro: true })}
          {openRule === 'session' &&
            editor(
              <Choice<number>
                label={t('protect.rule.session')}
                value={config.sessionLimit ?? 0}
                onChange={(sessionLimit) => saveCustom({ sessionLimit }, 'session_guard')}
                options={[0, 5, 10, 15, 30].map((minutes) => ({ value: minutes, label: minutesValue(minutes) }))}
              />,
              t('protect.rule.sessionNote'),
            )}

          {ruleRow('budget', t('protect.rule.budget'), minutesValue(config.dailyLimit), { pro: true })}
          {openRule === 'budget' &&
            editor(
              <Choice<number>
                label={t('protect.rule.budget')}
                value={config.dailyLimit}
                onChange={(dailyLimit) => saveCustom({ dailyLimit }, 'daily_budget')}
                options={[0, 15, 30, 60, 90].map((minutes) => ({ value: minutes, label: minutesValue(minutes) }))}
              />,
              t('protect.rule.budgetNote'),
            )}

          <Row
            label={t('protect.rule.schedule')}
            value={
              schedules.length > 0
                ? schedules.map((schedule) => schedule.name).join(', ')
                : t('protect.rule.scheduleNone')
            }
            onClick={() => navigate('protect')}
          />

          {ruleRow(
            'emergency',
            t('protect.rule.emergency'),
            committed
              ? t('protect.feed.blocked')
              : config.emergencyUnlock.enabled
                ? t('protect.rule.emergencyValue', { count: config.emergencyUnlock.maxPerDay })
                : t('common.off'),
          )}
          {openRule === 'emergency' &&
            editor(
              <Row
                label={t('protect.rule.emergencyAllow')}
                right={
                  <Switch
                    checked={config.emergencyUnlock.enabled}
                    ariaLabel={t('protect.rule.emergencyAllow')}
                    onChange={(enabled) => {
                      if (committed && enabled) return;
                      save({ ...config, emergencyUnlock: { ...config.emergencyUnlock, enabled } });
                    }}
                  />
                }
              />,
              t('protect.rule.emergencyNote', {
                count: config.emergencyUnlock.maxPerDay,
                minutes: config.emergencyUnlock.durationMinutes,
              }),
            )}
        </List>
        {!pro && (
          <p className="mt-3 flex items-start gap-2 px-1 text-body-s text-muted">
            <Info size={16} strokeWidth={2} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
            {t('protect.detail.customNote', { preset: getPresetLabel(presetId) })}
          </p>
        )}
      </Section>
    </Page>
  );
}

// ── Zeitplan bearbeiten ─────────────────────────────────────────────────────

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const FIELD = `min-h-12 w-full rounded-control border border-line bg-surface px-4 text-body text-ink ${FOCUS_RING_INSET}`;

export function ScheduleEditScreen({ state, updateState, navigate }: ScreenProps) {
  const schedule = state.schedules.find((entry) => entry.id === state.selectedScheduleId);
  if (!schedule) return null;
  const committed = isCommitmentActive(state);
  const protectedApps = SUPPORTED_APPS.filter((app) => state.appsConfig[app.id]?.active);

  const change = (patch: Partial<Schedule>) =>
    updateState((previous) => ({
      schedules: previous.schedules.map((entry) => (entry.id === schedule.id ? { ...entry, ...patch } : entry)),
    }));

  const remove = () => {
    updateState((previous) => ({
      schedules: previous.schedules.filter((entry) => entry.id !== schedule.id),
      selectedScheduleId: null,
    }));
    navigate('protect');
  };

  const hourSelect = (label: string, value: number, onChange: (hour: number) => void) => (
    <label className="flex flex-1 flex-col gap-1 text-label-s text-muted">
      {label}
      <select value={value} onChange={(event) => onChange(Number(event.target.value))} className={FIELD}>
        {HOURS.map((hour) => (
          <option key={hour} value={hour}>
            {formatHour(hour)}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <Page>
      <Header
        title={t('protect.schedule.title')}
        onBack={() => navigate('protect')}
        rightAction={
          <button
            onClick={remove}
            disabled={committed}
            className={`min-h-12 rounded-control px-3 text-label text-ink disabled:opacity-[0.38] ${PRESSED} ${FOCUS_RING_INSET}`}
          >
            {t('protect.schedule.delete')}
          </button>
        }
      />

      <Section title={t('protect.schedule.name')}>
        <input
          value={schedule.name}
          onChange={(event) => change({ name: event.target.value })}
          aria-label={t('protect.schedule.name')}
          className={FIELD}
        />
      </Section>

      <Section title={t('protect.schedule.time')}>
        <div className="flex gap-3">
          {hourSelect(t('protect.schedule.from'), schedule.startHour, (startHour) => change({ startHour }))}
          {hourSelect(t('protect.schedule.until'), schedule.endHour, (endHour) => change({ endHour }))}
        </div>
        {schedule.startHour === schedule.endHour ? (
          <p className="mt-2 px-1 text-body-s text-pause">{t('protect.schedule.same')}</p>
        ) : (
          schedule.endHour < schedule.startHour && (
            <p className="mt-2 px-1 text-body-s text-muted">{t('protect.schedule.overnight')}</p>
          )
        )}
      </Section>

      <Section title={t('protect.schedule.during')}>
        <div className={`flex items-start gap-3 p-4 ${CARD}`}>
          <CalendarClock size={20} strokeWidth={1.75} className="mt-0.5 flex-shrink-0 text-muted" aria-hidden="true" />
          <p className="text-body-s text-ink">{t('protect.schedule.duringText')}</p>
        </div>
      </Section>

      <Section title={t('protect.schedule.apps')}>
        {protectedApps.length > 0 ? (
          <List>
            {protectedApps.map((app) => (
              <Row
                key={app.id}
                leading={<AppTile app={app} />}
                label={app.name}
                strong
                right={
                  <Switch
                    checked={schedule.appIds.includes(app.id)}
                    ariaLabel={t('protect.schedule.appIn', { app: app.name })}
                    onChange={(checked) => {
                      if (!checked && committed) return;
                      change({
                        appIds: checked ? [...schedule.appIds, app.id] : schedule.appIds.filter((id) => id !== app.id),
                      });
                    }}
                  />
                }
              />
            ))}
          </List>
        ) : (
          <p className="px-4 text-body-s text-muted">{t('protect.schedule.noApps')}</p>
        )}
      </Section>

      <Section>
        <List>
          <Row
            label={t('protect.schedule.active')}
            right={
              <Switch
                checked={schedule.active}
                ariaLabel={t('protect.schedule.active')}
                onChange={(active) => {
                  if (!active && committed) return;
                  change({ active });
                }}
              />
            }
          />
        </List>
      </Section>

      <PrimaryButton onClick={() => navigate('protect')}>{t('protect.schedule.done')}</PrimaryButton>
    </Page>
  );
}

// ── Selbstverpflichtung ─────────────────────────────────────────────────────

type CommitmentChoice = 'tonight' | 'morning' | 'day' | 'custom';

/** Minutes until the next full hour `hour`, today or tomorrow. */
const minutesUntilHour = (hour: number) => minutesUntilClockTime(hour, 0);

export function CommitmentScreen({ state, updateState, navigate }: ScreenProps) {
  const now = new Date(Date.now());
  const offersTonight = now.getHours() < 21;
  const [choice, setChoice] = useState<CommitmentChoice>('morning');
  const [customHour, setCustomHour] = useState(18);
  const [confirming, setConfirming] = useState(false);
  const active = isCommitmentActive(state);

  const minutes = {
    tonight: minutesUntilHour(22),
    morning: minutesUntilHour(7),
    day: 24 * 60,
    custom: minutesUntilHour(customHour),
  }[choice];
  const until = Date.now() + minutes * 60_000;

  const options: { value: CommitmentChoice; label: string }[] = [
    ...(offersTonight
      ? [
          {
            value: 'tonight' as const,
            label: t('commitment.until', { until: formatUntil(Date.now() + minutesUntilHour(22) * 60_000) }),
          },
        ]
      : []),
    {
      value: 'morning',
      label: t('commitment.until', { until: formatUntil(Date.now() + minutesUntilHour(7) * 60_000) }),
    },
    { value: 'day', label: t('commitment.day') },
    { value: 'custom', label: t('commitment.custom') },
  ];

  const RULES: MessageKey[] = [
    'commitment.rule.stricter',
    'commitment.rule.apps',
    'commitment.rule.noEmergency',
    'commitment.rule.focus',
  ];

  return (
    <Page>
      <Header title={t('protect.commitment')} onBack={() => navigate('protect')} />

      {active && state.commitment ? (
        <div className={`flex flex-col gap-2 p-4 ${CARD}`}>
          <p className="text-title-s text-ink">
            {t('protect.commitment.active', { until: formatUntil(state.commitment.until) })}
          </p>
          <p className="text-body-s text-muted">{t('commitment.activeText')}</p>
        </div>
      ) : (
        <>
          <h2 className="text-title text-ink">{t('commitment.question')}</h2>
          <p className="mb-4 mt-1 text-body-s text-muted">{t('commitment.subtitle')}</p>

          <OptionList<CommitmentChoice>
            label={t('commitment.question')}
            value={choice}
            onChange={setChoice}
            options={options}
          />
          {choice === 'custom' && (
            <label className="mt-3 flex flex-col gap-1 text-label-s text-muted">
              {t('commitment.customHour')}
              <select
                value={customHour}
                onChange={(event) => setCustomHour(Number(event.target.value))}
                className={FIELD}
              >
                {HOURS.map((hour) => (
                  <option key={hour} value={hour}>
                    {formatHour(hour)}
                  </option>
                ))}
              </select>
            </label>
          )}

          <Section title={t('commitment.then')}>
            <ul className={`flex flex-col gap-3 p-4 ${CARD}`}>
              {RULES.map((rule) => (
                <li key={rule} className="flex items-start gap-3 text-body-s text-ink">
                  <LockKeyhole
                    size={16}
                    strokeWidth={2}
                    className="mt-0.5 flex-shrink-0 text-muted"
                    aria-hidden="true"
                  />
                  {t(rule)}
                </li>
              ))}
            </ul>
          </Section>

          <PrimaryButton onClick={() => setConfirming(true)}>{t('common.continue')}</PrimaryButton>

          {confirming && (
            <Sheet
              title={t('commitment.confirm.title', { until: formatUntil(until) })}
              onClose={() => setConfirming(false)}
            >
              <p className="mt-2 text-body text-muted">{t('commitment.confirm.text')}</p>
              <p className="mt-4 flex items-start gap-2 text-body-s text-ink">
                <Info size={16} strokeWidth={2} className="mt-0.5 flex-shrink-0 text-muted" aria-hidden="true" />
                {t('commitment.confirm.ends', { until: formatUntil(until) })}
              </p>
              <div className="mt-6 flex flex-col gap-1">
                <PrimaryButton
                  onClick={() => {
                    updateState({ commitment: { until } });
                    navigate('protect');
                  }}
                >
                  {t('commitment.confirm.action')}
                </PrimaryButton>
                <TextButton onClick={() => setConfirming(false)}>{t('commitment.confirm.cancel')}</TextButton>
              </div>
            </Sheet>
          )}
        </>
      )}
    </Page>
  );
}
