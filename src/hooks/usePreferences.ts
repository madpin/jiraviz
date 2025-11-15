import { useState, useEffect, useCallback } from 'react';
import { UserPreferences, VisualPreferences, LayoutPreferences, DataDisplayPreferences } from '../types';

const PREFERENCES_KEY = 'jiraviz-preferences';

const defaultPreferences: UserPreferences = {
  visual: {
    theme: 'dark',
    accentColor: 'cyan',
    density: 'comfortable',
    fontSize: 'medium',
    animationSpeed: 'normal',
  },
  layout: {
    detailPanelPosition: 'right',
    detailPanelWidth: 33,
    treeViewStyle: 'card',
    sidebarCollapsible: false,
    rememberPanelSizes: true,
  },
  dataDisplay: {
    showAssignee: true,
    showPriority: true,
    showLabels: true,
    showDueDate: true,
    showDescription: true,
    showTicketCounts: true,
    showIcons: true,
    dateFormat: 'short',
    defaultSortOrder: 'default',
    showReporter: true,
    showLastUpdated: true,
    closedTicketsDays: 7,
  },
};

export function usePreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('dark');

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PREFERENCES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences({ ...defaultPreferences, ...parsed });
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  }, []);

  // Handle system theme detection
  useEffect(() => {
    if (preferences.visual.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const updateTheme = () => {
        setEffectiveTheme(mediaQuery.matches ? 'dark' : 'light');
      };
      
      updateTheme();
      mediaQuery.addEventListener('change', updateTheme);
      return () => mediaQuery.removeEventListener('change', updateTheme);
    } else {
      setEffectiveTheme(preferences.visual.theme);
    }
  }, [preferences.visual.theme]);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    
    // Apply theme class
    root.classList.remove('light', 'dark');
    root.classList.add(effectiveTheme);
    
    // Apply accent color
    root.setAttribute('data-accent', preferences.visual.accentColor);
    
    // Apply density
    root.setAttribute('data-density', preferences.visual.density);
    
    // Apply font size
    root.setAttribute('data-font-size', preferences.visual.fontSize);
    
    // Apply animation speed
    root.setAttribute('data-animation', preferences.visual.animationSpeed);
  }, [effectiveTheme, preferences.visual]);

  // Save preferences to localStorage
  const savePreferences = useCallback((newPreferences: UserPreferences) => {
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(newPreferences));
      setPreferences(newPreferences);
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  }, []);

  // Update specific sections
  const updateVisualPreferences = useCallback((visual: Partial<VisualPreferences>) => {
    setPreferences((prev) => {
      const updated = {
        ...prev,
        visual: { ...prev.visual, ...visual },
      };
      savePreferences(updated);
      return updated;
    });
  }, [savePreferences]);

  const updateLayoutPreferences = useCallback((layout: Partial<LayoutPreferences>) => {
    setPreferences((prev) => {
      const updated = {
        ...prev,
        layout: { ...prev.layout, ...layout },
      };
      savePreferences(updated);
      return updated;
    });
  }, [savePreferences]);

  const updateDataDisplayPreferences = useCallback((dataDisplay: Partial<DataDisplayPreferences>) => {
    setPreferences((prev) => {
      const updated = {
        ...prev,
        dataDisplay: { ...prev.dataDisplay, ...dataDisplay },
      };
      savePreferences(updated);
      return updated;
    });
  }, [savePreferences]);

  // Reset to defaults
  const resetPreferences = useCallback(() => {
    savePreferences(defaultPreferences);
  }, [savePreferences]);

  return {
    preferences,
    effectiveTheme,
    updateVisualPreferences,
    updateLayoutPreferences,
    updateDataDisplayPreferences,
    savePreferences,
    resetPreferences,
  };
}

