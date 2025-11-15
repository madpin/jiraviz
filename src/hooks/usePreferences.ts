import { useState, useEffect, useCallback } from 'react';
import { UserPreferences, VisualPreferences, LayoutPreferences, DataDisplayPreferences } from '../types';
import { indexedDBService } from '../services/indexedDB';

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
  // Initialize from localStorage cache if available (synchronous, prevents flash)
  const getInitialPreferences = (): UserPreferences => {
    try {
      const cachedPrefs = localStorage.getItem('jiraviz-preferences-cache');
      if (cachedPrefs) {
        const parsed = JSON.parse(cachedPrefs);
        return { ...defaultPreferences, ...parsed };
      }
    } catch (error) {
      console.error('Failed to parse cached preferences:', error);
    }
    return defaultPreferences;
  };

  const [preferences, setPreferences] = useState<UserPreferences>(getInitialPreferences());
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>(() => {
    const initial = getInitialPreferences();
    if (initial.visual.theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return initial.visual.theme;
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load preferences from IndexedDB on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const stored = await indexedDBService.loadPreferences();
        if (stored) {
          const merged = { ...defaultPreferences, ...stored };
          setPreferences(merged);
          // Update localStorage cache
          localStorage.setItem('jiraviz-preferences-cache', JSON.stringify(merged));
        }
      } catch (error) {
        console.error('Failed to load preferences:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadPreferences();
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

  // Save preferences to IndexedDB
  const savePreferences = useCallback(async (newPreferences: UserPreferences) => {
    try {
      await indexedDBService.savePreferences(newPreferences);
      // Also cache in localStorage for synchronous access on page load
      localStorage.setItem('jiraviz-preferences-cache', JSON.stringify(newPreferences));
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
    isLoading,
    updateVisualPreferences,
    updateLayoutPreferences,
    updateDataDisplayPreferences,
    savePreferences,
    resetPreferences,
  };
}

