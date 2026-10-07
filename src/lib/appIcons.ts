import { createContext, useContext } from 'react';

/**
 * Launcher icons of the installed protected apps as PNG data URLs, keyed by
 * Android package. App reads them from the device; on web and iOS the map
 * stays empty and the tiles keep their initials.
 */
export const AppIconsContext = createContext<ReadonlyMap<string, string>>(new Map());

/** The icon of the first installed package in the order given (the full app before its lite version). */
export function useAppIcon(packages: string[]): string | null {
  const icons = useContext(AppIconsContext);
  return packages.map((name) => icons.get(name)).find(Boolean) ?? null;
}
