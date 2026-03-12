import { useState, useCallback, useEffect, useRef } from 'react';

import type { PeeksySettings } from '../lib/types';
import { DEFAULT_SETTINGS } from '../lib/constants';

// ── Config ──

const STORAGE_KEY = 'peeksy-settings';

// ── Hook ──

export function useSettings() {
  const [settings, setSettings] = useState<PeeksySettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (error) {
      console.error('[Settings] Failed to parse stored settings:', error);
    }
    return DEFAULT_SETTINGS;
  });

  const settingsRef = useRef(settings);

  // Keep ref in sync and persist to localStorage on every change
  useEffect(() => {
    settingsRef.current = settings;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('[Settings] Failed to save settings:', error);
    }
  }, [settings]);

  const updateSetting = useCallback(<K extends keyof PeeksySettings>(
    key: K,
    value: PeeksySettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateNestedSetting = useCallback(<
    K extends keyof PeeksySettings,
    NK extends keyof PeeksySettings[K]
  >(
    key: K,
    nestedKey: NK,
    value: PeeksySettings[K][NK]
  ) => {
    setSettings(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] as object),
        [nestedKey]: value,
      },
    }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return {
    settings,
    updateSetting,
    updateNestedSetting,
    resetSettings,
  };
}
