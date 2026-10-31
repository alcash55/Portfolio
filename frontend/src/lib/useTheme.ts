import { useCallback, useSyncExternalStore } from 'react';
import {
  THEME_STORAGE_KEY,
  applyTheme,
  readStoredTheme,
  resolveTheme,
  saveTheme,
  type ResolvedTheme,
  type ThemeChoice,
} from './theme';

const DARK_QUERY = '(prefers-color-scheme: dark)';

// Holds the choice only when storage is blocked, so the control still works for this visit.
let memoryChoice: ThemeChoice | null = null;
const choiceListeners = new Set<() => void>();

function subscribeChoice(onChange: () => void): () => void {
  choiceListeners.add(onChange);
  const onStorage = (event: StorageEvent) => {
    // Another tab changed the theme. null means storage was cleared.
    if (event.key === THEME_STORAGE_KEY || event.key === null) {
      memoryChoice = null;
      applyTheme(readStoredTheme(), document.documentElement);
      onChange();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    choiceListeners.delete(onChange);
    window.removeEventListener('storage', onStorage);
  };
}

const getChoice = (): ThemeChoice => memoryChoice ?? readStoredTheme();
// The server cannot read localStorage. "system" is also what the no-JS page shows.
const getServerChoice = (): ThemeChoice => 'system';

export function setThemeChoice(choice: ThemeChoice): void {
  applyTheme(choice, document.documentElement);
  memoryChoice = saveTheme(choice) ? null : choice;
  choiceListeners.forEach((listener) => listener());
}

function subscribeSystem(onChange: () => void): () => void {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

const getSystemPrefersDark = (): boolean => window.matchMedia(DARK_QUERY).matches;

export function useThemeChoice(): ThemeChoice {
  return useSyncExternalStore(subscribeChoice, getChoice, getServerChoice);
}

export function useSystemPrefersDark(): boolean {
  return useSyncExternalStore(subscribeSystem, getSystemPrefersDark, () => false);
}

export function useTheme(): {
  choice: ThemeChoice;
  resolved: ResolvedTheme;
  setChoice: (choice: ThemeChoice) => void;
} {
  const choice = useThemeChoice();
  const systemPrefersDark = useSystemPrefersDark();
  const setChoice = useCallback((next: ThemeChoice) => setThemeChoice(next), []);
  return { choice, resolved: resolveTheme(choice, systemPrefersDark), setChoice };
}
