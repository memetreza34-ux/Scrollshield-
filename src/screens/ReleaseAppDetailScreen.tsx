import {
  createReleaseDefaultAppConfig,
  isLegacyUntouchedDefaultConfig,
} from '../lib/releaseProfiles';
import type { AppState, Screen } from '../types';
import { AppDetailScreen } from './AppDetailScreen';

export function ReleaseAppDetailScreen({
  state,
  updateState,
  navigate,
}: {
  state: AppState;
  updateState: (updates: Partial<AppState>) => void;
  navigate: (screen: Screen) => void;
}) {
  const appId = state.selectedAppId;
  if (!appId) {
    return <AppDetailScreen state={state} updateState={updateState} navigate={navigate} />;
  }

  const existing = state.appsConfig[appId];
  if (existing && !isLegacyUntouchedDefaultConfig(existing)) {
    return <AppDetailScreen state={state} updateState={updateState} navigate={navigate} />;
  }

  const releaseState: AppState = {
    ...state,
    appsConfig: {
      ...state.appsConfig,
      [appId]: createReleaseDefaultAppConfig(appId, existing?.active ?? false),
    },
  };

  return <AppDetailScreen state={releaseState} updateState={updateState} navigate={navigate} />;
}
