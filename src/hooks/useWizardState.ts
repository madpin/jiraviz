import { useState, useEffect, useCallback } from 'react';
import { WizardState } from '../types';

const WIZARD_STATE_KEY = 'jiraviz_wizard_state';

const defaultState: WizardState = {
  projectDescription: '',
  selectedEpic: null,
  selectedTemplate: null,
  generatedTicket: null,
  multiTicketPlan: [],
  multiTicketDrafts: [],
};

/**
 * Custom hook to manage wizard state across routes using sessionStorage
 */
export function useWizardState() {
  const [state, setState] = useState<WizardState>(() => {
    try {
      const saved = sessionStorage.getItem(WIZARD_STATE_KEY);
      if (saved) {
        return { ...defaultState, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error('Error loading wizard state:', error);
    }
    return defaultState;
  });

  // Save to sessionStorage whenever state changes
  useEffect(() => {
    try {
      sessionStorage.setItem(WIZARD_STATE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving wizard state:', error);
    }
  }, [state]);

  const updateWizardState = useCallback((updates: Partial<WizardState>) => {
    setState((prev) => {
      const newState = { ...prev, ...updates };
      
      // Save immediately to sessionStorage to ensure persistence before navigation
      try {
        sessionStorage.setItem(WIZARD_STATE_KEY, JSON.stringify(newState));
      } catch (error) {
        console.error('Error saving wizard state to sessionStorage:', error);
      }
      
      return newState;
    });
  }, []);

  const resetWizardState = useCallback(() => {
    setState(defaultState);
    try {
      sessionStorage.removeItem(WIZARD_STATE_KEY);
    } catch (error) {
      console.error('Error clearing wizard state:', error);
    }
  }, []);

  const getWizardState = useCallback(() => state, [state]);

  return {
    state,
    updateWizardState,
    resetWizardState,
    getWizardState,
  };
}

