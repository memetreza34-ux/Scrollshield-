import { useState } from 'react';
import { Check, Clock3, Edit3, LockKeyhole, Plus, Save, Shield, Trash2, X } from 'lucide-react';
import { motion } from 'motion/react';
import { Header } from '../components/ui';
import {
  getReleaseProfileConfig,
  getReleaseProfilePresentation,
  getReleaseSafeProfileConfig,
} from '../lib/releaseProfiles';
import {
  isCommitmentLockActive,
  type CommitmentDurationMinutes,
  type CommitmentLock,
  type CommitmentStartResult,
} from '../lib/commitmentLock';
import type { AppConfig, AppState, Profile, Screen } from '../types';
import { DEFAULT_APP_CONFIG, SUPPORTED_APPS } from '../types';

const getSourceConfig = (
  appId: string,
  source: Record<string, AppConfig>,
  fallback: Record<string, AppConfig>,
): AppConfig =>
  source[appId] ||
  fallback[appId] || {
    id: appId,
    ...DEFAULT_APP_CONFIG,
    active: false,
  };

const createCurrentSnapshot = (
  source: Record<string, AppConfig>,
  fallback: Record<string, AppConfig>,
): Record<string, AppConfig> => {
  const result: Record<string, AppConfig> = {};
  for (const app of SUPPORTED_APPS) {
    const config = getSourceConfig(app.id, source, fallback);
    result[app.id] = getReleaseSafeProfileConfig({ ...config, id: app.id });
  }
  return result;
};

const createProfileAppsConfig = (
  profileId: string,
  source: Record<string, AppConfig>,
  fallback: Record<string, AppConfig>,
): Record<string, AppConfig> => {
  const result: Record<string, AppConfig> = {};
  const switchedAt = Date.now();
  for (const app of SUPPORTED_APPS) {
    const config = getSourceConfig(app.id, source, fallback);
    result[app.id] = {
      ...getReleaseProfileConfig(profileId, { ...config, id: app.id }),
      updatedAt: config.updatedAt ?? switchedAt,
    };
  }
  return result;
};

const countProfileRules = (appsConfig: Record<string, AppConfig>) => {
  const configs = Object.values(appsConfig);
  return {
    active: configs.filter((config) => config.active).length,
    strict: configs.filter((config) => config.active && config.mode === 'strict').length,
  };
};

const durationLabel = (minutes: CommitmentDurationMinutes) =>
  minutes === 60 ? '1 Stunde' : minutes === 480 ? '8 Stunden' : '24 Stunden';

export function ProfilesScreen({
  state,
  updateState,
  navigate,
  commitmentLock = null,
  onStartCommitment,
}: {
  state: AppState;
  updateState: (updates: Partial<AppState>) => void;
  navigate: (screen: Screen) => void;
  commitmentLock?: CommitmentLock | null;
  onStartCommitment?: (durationMinutes: CommitmentDurationMinutes) => Promise<CommitmentStartResult>;
}) {
  const profiles = state.profiles || [];
  const activeProfileId = state.activeProfileId || profiles[0]?.id || 'gentle';
  const commitmentActive = isCommitmentLockActive(commitmentLock);
  const activeAppCount = Object.values(state.appsConfig).filter((config) => config.active).length;
  const commitmentConfigurationMessage =
    state.operatingSystem !== 'android'
      ? 'Commitment ist in Version 1 nur mit dem nativen Android-Schutz verfügbar.'
      : activeAppCount === 0
        ? 'Aktiviere zuerst mindestens eine App, bevor du ihre Schutzregeln verbindlich einfrierst.'
        : null;
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pendingCommitment, setPendingCommitment] = useState<CommitmentDurationMinutes | null>(null);
  const [commitmentStarting, setCommitmentStarting] = useState(false);
  const [commitmentFailure, setCommitmentFailure] = useState<{
    message: string;
    action?: 'apps' | 'permissions';
  } | null>(null);

  const saveCurrentIntoProfiles = () =>
    profiles.map((profile) =>
      profile.id === activeProfileId
        ? {
            ...profile,
            appsConfig: createCurrentSnapshot(state.appsConfig, state.appsConfig),
          }
        : profile,
    );

  const switchProfile = (profileId: string) => {
    if (commitmentActive || profileId === activeProfileId) return;
    const updatedProfiles = saveCurrentIntoProfiles();
    const target = updatedProfiles.find((profile) => profile.id === profileId);
    if (!target) return;

    updateState({
      profiles: updatedProfiles,
      activeProfileId: profileId,
      appsConfig: createProfileAppsConfig(profileId, target.appsConfig, state.appsConfig),
    });
  };

  const startCreate = () => {
    if (commitmentActive) return;
    setCreating(true);
    setEditingProfileId(null);
    setName('');
    setDescription('');
  };

  const startEdit = (profile: Profile) => {
    if (commitmentActive || !profile.isCustom) return;
    setCreating(false);
    setEditingProfileId(profile.id);
    setName(profile.name);
    setDescription(profile.description);
  };

  const cancelEdit = () => {
    setCreating(false);
    setEditingProfileId(null);
    setName('');
    setDescription('');
  };

  const saveProfile = () => {
    if (commitmentActive) return;
    const cleanName = name.trim().slice(0, 40);
    const cleanDescription = description.trim().slice(0, 160);
    if (!cleanName) return;

    if (creating) {
      const id = `custom_${Date.now()}`;
      const profile: Profile = {
        id,
        name: cleanName,
        description: cleanDescription || 'Eigene Schutzkonfiguration',
        icon: 'Shield',
        color: 'text-emerald-400',
        isCustom: true,
        appsConfig: createCurrentSnapshot(state.appsConfig, state.appsConfig),
        createdAt: Date.now(),
      };
      updateState({ profiles: [...profiles, profile] });
    } else if (editingProfileId) {
      updateState({
        profiles: profiles.map((profile) =>
          profile.id === editingProfileId
            ? {
                ...profile,
                name: cleanName,
                description: cleanDescription || 'Eigene Schutzkonfiguration',
              }
            : profile,
        ),
      });
    }
    cancelEdit();
  };

  const deleteProfile = (profileId: string) => {
    if (commitmentActive) return;
    const target = profiles.find((profile) => profile.id === profileId);
    if (!target?.isCustom) return;

    const remaining = profiles.filter((profile) => profile.id !== profileId);
    if (profileId !== activeProfileId) {
      updateState({ profiles: remaining });
      cancelEdit();
      return;
    }

    const fallback = remaining.find((profile) => profile.id === 'gentle') || remaining[0];
    updateState({
      profiles: remaining,
      activeProfileId: fallback?.id,
      appsConfig: fallback
        ? createProfileAppsConfig(fallback.id, fallback.appsConfig, state.appsConfig)
        : createCurrentSnapshot({}, state.appsConfig),
    });
    cancelEdit();
  };

  const confirmCommitment = async () => {
    if (!pendingCommitment || !onStartCommitment || commitmentStarting) return;
    setCommitmentFailure(null);
    setCommitmentStarting(true);
    try {
      const result = await onStartCommitment(pendingCommitment);
      if (!result.ok) {
        setCommitmentFailure({ message: result.message, action: result.action });
        return;
      }
      setPendingCommitment(null);
    } catch (error) {
      console.error('Commitment activation failed', error);
      setCommitmentFailure({
        message: 'Commitment konnte nicht sicher aktiviert werden. Der bestehende Schutz wurde nicht verändert.',
        action: 'permissions',
      });
    } finally {
      setCommitmentStarting(false);
    }
  };

  if (creating || editingProfileId) {
    const editing = profiles.find((profile) => profile.id === editingProfileId);
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 pb-32">
        <Header title={creating ? 'Schutzprofil erstellen' : 'Schutzprofil bearbeiten'} onBack={cancelEdit} />
        <div className="space-y-5">
          <section className="rounded-[1.5rem] border border-zinc-800/50 bg-zinc-900/75 p-5">
            <label htmlFor="profile-name" className="text-sm font-semibold text-zinc-200">
              Name
            </label>
            <input
              id="profile-name"
              value={name}
              maxLength={40}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            />

            <label htmlFor="profile-description" className="mt-5 block text-sm font-semibold text-zinc-200">
              Beschreibung
            </label>
            <textarea
              id="profile-description"
              value={description}
              maxLength={160}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-2 min-h-24 w-full resize-none rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            />
            <p className="mt-2 text-xs text-zinc-500">
              Ein neues Profil übernimmt die aktuellen App-Regeln als sicheren Snapshot. Regeln änderst du anschließend
              bei den einzelnen Apps.
            </p>
          </section>

          <div className="flex gap-3">
            {editing?.isCustom && (
              <button
                type="button"
                onClick={() => deleteProfile(editing.id)}
                className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 text-sm font-bold text-red-300"
              >
                <Trash2 size={17} aria-hidden="true" /> Löschen
              </button>
            )}
            <button
              type="button"
              onClick={cancelEdit}
              className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm font-bold text-zinc-300"
            >
              <X size={17} aria-hidden="true" /> Abbrechen
            </button>
            <button
              type="button"
              disabled={!name.trim()}
              onClick={saveProfile}
              className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-zinc-100 px-4 text-sm font-bold text-zinc-950 disabled:opacity-40"
            >
              <Save size={17} aria-hidden="true" /> Speichern
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-6 pb-32"
    >
      <Header title="Schutzprofile" onBack={() => navigate('dashboard')} />

      <section
        className={`mb-6 rounded-[1.5rem] border p-5 ${commitmentActive ? 'border-indigo-500/35 bg-indigo-500/10' : 'border-zinc-800 bg-zinc-900/70'}`}
        aria-labelledby="commitment-title"
      >
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${commitmentActive ? 'bg-indigo-500/15 text-indigo-200' : 'bg-zinc-800 text-zinc-400'}`}
          >
            {commitmentActive ? <LockKeyhole size={19} aria-hidden="true" /> : <Clock3 size={19} aria-hidden="true" />}
          </div>
          <div className="min-w-0 flex-1">
            <h1 id="commitment-title" className="font-semibold text-zinc-100">
              Commitment-Modus
            </h1>
            {commitmentActive && commitmentLock ? (
              <>
                <p className="mt-2 text-sm leading-relaxed text-indigo-100/80">
                  Deine aktuelle Schutzkonfiguration ist bis{' '}
                  {new Date(commitmentLock.lockedUntil).toLocaleString('de-DE')} eingefroren. Apps, Profile, Limits und
                  Zeitpläne können bis dahin nicht geändert werden.
                </p>
                <p className="mt-3 text-xs leading-relaxed text-zinc-400">
                  Notfallfreigabe, Hilfe, Datenexport und ein vollständiger App-Reset bleiben verfügbar. Berechtigungen
                  und Schutzstatus können weiterhin repariert werden. Der Reset löscht bewusst auch den Commitment-Lock.
                </p>
              </>
            ) : pendingCommitment ? (
              <div className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
                <p className="text-sm font-semibold text-amber-200">
                  {durationLabel(pendingCommitment)} verbindlich einfrieren?
                </p>
                <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                  Beim Start prüft ScrollShield zusätzlich, dass mindestens eine aktive Ziel-App wirklich installiert
                  ist und der Android-Schutzdienst tatsächlich läuft. Während der Laufzeit kannst du Schutzregeln nicht
                  abschwächen oder umkonfigurieren. Ein kompletter Reset bleibt als Sicherheitsausstieg möglich.
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPendingCommitment(null)}
                    disabled={commitmentStarting}
                    className="min-h-[44px] rounded-xl border border-zinc-700 px-4 text-sm font-bold text-zinc-300 disabled:opacity-40"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="button"
                    onClick={() => void confirmCommitment()}
                    disabled={commitmentStarting}
                    className="min-h-[44px] flex-1 rounded-xl bg-indigo-200 px-4 text-sm font-bold text-indigo-950 disabled:opacity-60"
                  >
                    {commitmentStarting ? 'Schutz wird geprüft…' : 'Verbindlich starten'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  Friere deine aktuelle Konfiguration bewusst für eine begrenzte Zeit ein. Das erschwert impulsives
                  Deaktivieren, ohne den sicheren Notfallweg zu entfernen.
                </p>
                {commitmentConfigurationMessage ? (
                  <div
                    role="status"
                    className="mt-4 rounded-xl border border-zinc-700/70 bg-zinc-950/60 p-3 text-xs leading-relaxed text-zinc-400"
                  >
                    <p>{commitmentConfigurationMessage}</p>
                    {state.operatingSystem === 'android' && activeAppCount === 0 && (
                      <button
                        type="button"
                        onClick={() => navigate('apps')}
                        className="mt-3 min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-800 px-4 font-bold text-zinc-200"
                      >
                        Apps auswählen
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {([60, 480, 1440] as CommitmentDurationMinutes[]).map((minutes) => (
                      <button
                        key={minutes}
                        type="button"
                        onClick={() => {
                          setCommitmentFailure(null);
                          setPendingCommitment(minutes);
                        }}
                        className="min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-800 px-2 text-xs font-bold text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                      >
                        {durationLabel(minutes)}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
            {commitmentFailure && (
              <div
                role="alert"
                className="mt-3 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs leading-relaxed text-red-200"
              >
                <p>{commitmentFailure.message}</p>
                {commitmentFailure.action && (
                  <button
                    type="button"
                    onClick={() => navigate(commitmentFailure.action as Screen)}
                    className="mt-3 min-h-[44px] rounded-xl border border-red-400/30 px-4 font-bold text-red-100"
                  >
                    {commitmentFailure.action === 'apps' ? 'Apps prüfen' : 'Schutzstatus öffnen'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mb-6 rounded-[1.5rem] border border-blue-500/25 bg-blue-500/5 p-5">
        <h2 className="font-semibold text-blue-100">Ein Profil wechselt die gesamte App-Konfiguration</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          Beim Wechsel werden Tageslimits, Session-Längen, Öffnungspausen, Fokusregeln, Sperrfenster, Anti-Binge und
          Notfallregeln gemeinsam übernommen und danach mit Android synchronisiert.
        </p>
      </section>

      <div className="mb-4 flex items-center justify-between px-1">
        <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Profile</h2>
        <button
          type="button"
          onClick={startCreate}
          disabled={commitmentActive}
          className="flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-500/10 px-3 text-sm font-bold text-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus size={16} aria-hidden="true" /> Eigenes Profil
        </button>
      </div>

      <div className="space-y-3" role="radiogroup" aria-label="Schutzprofil auswählen">
        {profiles.map((profile) => {
          const active = profile.id === activeProfileId;
          const presentation = getReleaseProfilePresentation(profile);
          const configForSummary = active ? state.appsConfig : profile.appsConfig;
          const counts = countProfileRules(configForSummary);
          return (
            <article
              key={profile.id}
              className={`rounded-[1.5rem] border ${active ? 'border-zinc-600 bg-zinc-900/90' : 'border-zinc-800/60 bg-zinc-950/60'}`}
            >
              <div className="flex items-stretch">
                <button
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => switchProfile(profile.id)}
                  disabled={commitmentActive}
                  className="flex min-h-[92px] min-w-0 flex-1 items-center gap-4 p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <div
                    className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-zinc-800 ${profile.color}`}
                    aria-hidden="true"
                  >
                    <Shield size={21} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-zinc-100">{presentation.name}</h3>
                      {active && <Check size={15} className="text-emerald-400" aria-hidden="true" />}
                      {profile.isCustom && (
                        <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] font-bold uppercase text-zinc-400">
                          Eigen
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-400">{presentation.description}</p>
                    <p className="mt-2 text-[11px] text-zinc-500">
                      {counts.active} aktive Apps · {counts.strict} strikt
                    </p>
                  </div>
                </button>

                {profile.isCustom && (
                  <button
                    type="button"
                    onClick={() => startEdit(profile)}
                    disabled={commitmentActive}
                    aria-label={`${presentation.name} bearbeiten`}
                    className="m-3 flex w-11 flex-shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Edit3 size={17} aria-hidden="true" />
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </motion.div>
  );
}
