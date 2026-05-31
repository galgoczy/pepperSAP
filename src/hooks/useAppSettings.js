import { useState, useEffect, useCallback } from 'react';

const SETTINGS_KEY = 'pepper_app_settings';

const DEFAULT_SETTINGS = {
  showReserve: true,
  // Which unit to pre-select when opening the daily entry / reports (admins):
  // 'default'  - the app default (first unit / "all" for reports)
  // 'remember' - the unit last opened
  // 'specific' - a fixed unit (defaultUnitId)
  defaultUnitMode: 'remember',
  defaultUnitId: '',
  // Updated automatically as the user switches units (for 'remember' mode)
  lastUnitId: '',
};

// Resolve which unit should be pre-selected, given the settings and the list
// of selectable restaurant units. `fallback` is the app default for the page
// (e.g. the first unit, or 'all' on the reports page).
export function resolveDefaultUnit(settings, restaurantUnits, fallback) {
  const isValid = (id) => id && restaurantUnits?.some((u) => u.id === id);
  if (settings?.defaultUnitMode === 'specific' && isValid(settings.defaultUnitId)) {
    return settings.defaultUnitId;
  }
  if (settings?.defaultUnitMode === 'remember' && isValid(settings.lastUnitId)) {
    return settings.lastUnitId;
  }
  return fallback;
}

export function useAppSettings() {
  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSetting = useCallback((key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  return { settings, updateSetting };
}
