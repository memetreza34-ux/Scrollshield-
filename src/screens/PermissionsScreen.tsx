import { useState } from 'react';
import {
  Battery,
  Bell,
  Check,
  Info,
  Layers,
  OctagonAlert,
  PersonStanding,
  ShieldCheck,
  Smartphone,
  type LucideIcon,
} from 'lucide-react';
import { AppPermissions, AppState, Screen } from '../types';
import {
  Header,
  InlineButton,
  List,
  Notice,
  Page,
  PrimaryButton,
  SecondaryButton,
  Section,
  StatusChip,
} from '../components/ui';
import { FOCUS_RING_INSET, PRESSED } from '../components/styles';
import { AccessibilityDisclosure } from '../components/AccessibilityDisclosure';
import { MessageKey, t } from '../i18n';
import { countProtectedApps } from '../lib/entitlements';
import { ScrollShieldBridge } from '../lib/nativeBridge';
import { usePermissionRequests } from '../lib/usePermissionRequests';

type PermissionKey = 'usageAccess' | 'overlay' | 'accessibility' | 'backgroundActivity' | 'notifications';

interface PermissionRow {
  key: PermissionKey;
  icon: LucideIcon;
  title: MessageKey;
  need: MessageKey;
  /** Only Android has these; the browser shows notifications alone. */
  androidOnly: boolean;
}

const ROWS: PermissionRow[] = [
  {
    key: 'usageAccess',
    icon: Smartphone,
    title: 'permission.usageAccess.title',
    need: 'status.need.required',
    androidOnly: true,
  },
  { key: 'overlay', icon: Layers, title: 'permission.overlay.title', need: 'status.need.required', androidOnly: true },
  {
    key: 'accessibility',
    icon: PersonStanding,
    title: 'status.accessibility',
    need: 'status.need.shortVideo',
    androidOnly: true,
  },
  {
    key: 'backgroundActivity',
    icon: Battery,
    title: 'permission.battery.title',
    need: 'status.need.recommended',
    androidOnly: true,
  },
  {
    key: 'notifications',
    icon: Bell,
    title: 'permission.notifications.title',
    need: 'status.need.optional',
    androidOnly: false,
  },
];

/**
 * Berechtigungen & Zustand (docs/V1_MASTER_PLAN.md, 4.9): whether the
 * protection service runs, every permission with its state and a button, and
 * the check of the short-video detection. The state is what Android reports.
 */
export function PermissionsScreen({
  state,
  updateState,
  navigate,
}: {
  state: AppState;
  updateState: (u: Partial<AppState> | ((previous: AppState) => Partial<AppState>)) => void;
  navigate: (s: Screen) => void;
}) {
  const { permissions, operatingSystem } = state;
  const android = operatingSystem === 'android';
  const { isNative, monitoringActive, refreshNativeStatus, requestPermission } = usePermissionRequests(updateState);
  const [showDisclosure, setShowDisclosure] = useState(false);

  const openAccessibilitySettings = () => {
    setShowDisclosure(false);
    void ScrollShieldBridge.openAccessibilitySettings().catch(() => undefined);
  };

  const ask = (key: PermissionKey) => {
    // Google Play requires the disclosure and an explicit "yes" before the
    // service is switched on; managing a running one needs neither.
    if (key === 'accessibility') {
      if (permissions.accessibility) openAccessibilitySettings();
      else setShowDisclosure(true);
      return;
    }
    void requestPermission(key);
  };

  const restart = async () => {
    try {
      await ScrollShieldBridge.startMonitoring();
    } catch {
      // Still stopped; the card stays.
    }
    await refreshNativeStatus();
  };

  const rows = ROWS.filter((row) => android || !row.androidOnly);
  const serviceStopped = isNative && monitoringActive === false && countProtectedApps(state) > 0;

  return (
    <Page>
      {showDisclosure && (
        <AccessibilityDisclosure onAccept={openAccessibilitySettings} onDecline={() => setShowDisclosure(false)} />
      )}
      <Header title={t('status.title')} onBack={() => navigate('settings')} />

      <div className="mb-6">
        {!isNative ? (
          <Notice icon={Info} title={t('status.web')}>
            {t('status.webText')}
          </Notice>
        ) : serviceStopped ? (
          <div role="alert" className="flex flex-col gap-3.5 rounded-surface bg-lock/10 p-4">
            <div className="flex items-start gap-3">
              <OctagonAlert size={24} strokeWidth={1.75} className="flex-shrink-0 text-lock" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-title-s text-ink">{t('status.stopped')}</p>
                <p className="mt-0.5 text-body-s text-ink">{t('status.stoppedText')}</p>
              </div>
            </div>
            <PrimaryButton onClick={() => void restart()}>{t('status.restart')}</PrimaryButton>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-surface border border-line bg-surface p-4">
            <ShieldCheck
              size={24}
              strokeWidth={1.75}
              className={`flex-shrink-0 ${monitoringActive ? 'text-accent' : 'text-muted'}`}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="text-title-s text-ink">{t(monitoringActive ? 'status.running' : 'status.idle')}</p>
              <p className="mt-0.5 text-body-s text-muted">
                {t(monitoringActive ? 'status.runningText' : 'status.idleText')}
              </p>
            </div>
          </div>
        )}
      </div>

      <Section title={t('status.permissions')} kind="title">
        <List>
          {rows.map((row) => (
            <PermissionStateRow
              key={row.key}
              row={row}
              granted={permissions[row.key as keyof AppPermissions]}
              // Android has no screen of its own for a granted notification permission.
              canManage={isNative && row.key !== 'notifications'}
              onAsk={() => ask(row.key)}
            />
          ))}
        </List>
        {isNative && <p className="mt-2 px-1 text-caption text-muted">{t('status.tapHint')}</p>}
      </Section>

      {serviceStopped && (
        <div className="mb-6">
          <Notice
            icon={Info}
            action={
              <button
                onClick={() => navigate('support')}
                className={`min-h-10 text-label text-ink underline underline-offset-[3px] ${FOCUS_RING_INSET}`}
              >
                {t('status.makerLink')}
              </button>
            }
          >
            {t('status.maker')}
          </Notice>
        </div>
      )}

      {android && (
        <Section title={t('status.detection')} kind="title">
          <div className="flex flex-col gap-3.5 rounded-surface border border-line bg-surface p-4">
            <p className="text-body text-ink">
              {permissions.accessibility ? t('status.detectionText') : t('status.detectionOff')}
            </p>
            <SecondaryButton onClick={() => navigate('diagnostics')}>{t('status.check')}</SecondaryButton>
            <p className="text-caption text-muted">{t('status.checkHint')}</p>
          </div>
        </Section>
      )}
    </Page>
  );
}

/**
 * One permission: granted rows show a check and open the Android setting when
 * tapped; a missing one shows its state in a chip and a button.
 */
function PermissionStateRow({
  row,
  granted,
  canManage,
  onAsk,
}: {
  row: PermissionRow;
  granted: boolean;
  canManage: boolean;
  onAsk: () => void;
}) {
  const Icon = row.icon;
  const isService = row.key === 'accessibility';
  const title = t(row.title);
  const leading = <Icon size={24} strokeWidth={1.75} className="flex-shrink-0 text-ink" aria-hidden="true" />;

  if (granted) {
    const content = (
      <>
        {leading}
        <span className="min-w-0 flex-1">
          <span className="block text-body text-ink">{title}</span>
          <span className="block text-caption text-muted">{t(row.need)}</span>
        </span>
        <span className="flex flex-shrink-0 items-center gap-1.5 text-label-s text-ink">
          <Check size={18} strokeWidth={2} className="text-accent" aria-hidden="true" />
          {t(isService ? 'status.on' : 'permission.granted')}
        </span>
      </>
    );
    const layout = 'flex min-h-16 w-full items-center gap-4 px-4 py-2 text-left';
    return canManage ? (
      <button onClick={onAsk} className={`${layout} ${PRESSED} ${FOCUS_RING_INSET}`}>
        {content}
      </button>
    ) : (
      <div className={layout}>{content}</div>
    );
  }

  return (
    <div className="flex min-h-16 items-center gap-4 px-4 py-3">
      {leading}
      <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
        <span className="text-body text-ink">{title}</span>
        {/* Orange only where protection is really missing; an optional permission stays calm. */}
        {row.need === 'status.need.optional' ? (
          <span className="text-caption text-muted">{t(row.need)}</span>
        ) : (
          <StatusChip tone="pause">{t(isService ? 'status.off' : 'status.missing')}</StatusChip>
        )}
      </span>
      <InlineButton onClick={onAsk} ariaLabel={`${t(isService ? 'status.switchOn' : 'permission.allow')}: ${title}`}>
        {t(isService ? 'status.switchOn' : 'permission.allow')}
      </InlineButton>
    </div>
  );
}
