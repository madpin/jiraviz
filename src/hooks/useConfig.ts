import { useState, useEffect } from 'react';
import { AppConfig } from '../types';

const CONFIG_KEY = 'jiraviz_config';

export function useConfig() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = () => {
    try {
      const savedConfig = localStorage.getItem(CONFIG_KEY);
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        setConfig(parsed);
        const configured = !!(
          parsed.jira?.url &&
          parsed.jira?.token &&
          parsed.llm?.apiKey
        );
        setIsConfigured(configured);
      } else {
        setIsConfigured(false);
      }
    } catch (error) {
      console.error('Failed to load config:', error);
      setIsConfigured(false);
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfig = (newConfig: AppConfig) => {
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(newConfig));
      setConfig(newConfig);
      setIsConfigured(
        !!newConfig.jira?.url &&
        !!newConfig.jira?.token &&
        !!newConfig.llm?.apiKey
      );
    } catch (error) {
      console.error('Failed to save config:', error);
      throw error;
    }
  };

  const clearConfig = () => {
    localStorage.removeItem(CONFIG_KEY);
    setConfig(null);
    setIsConfigured(false);
  };

  return {
    config,
    isConfigured,
    isLoading,
    saveConfig,
    clearConfig,
    reloadConfig: loadConfig,
  };
}

