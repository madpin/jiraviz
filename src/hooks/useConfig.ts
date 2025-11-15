import { useState, useEffect } from 'react';
import { AppConfig } from '../types';
import { indexedDBService } from '../services/indexedDB';

export function useConfig() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const savedConfig = await indexedDBService.loadConfig();
      if (savedConfig) {
        setConfig(savedConfig);
        const configured = !!(
          savedConfig.jira?.url &&
          savedConfig.jira?.token &&
          savedConfig.llm?.apiKey
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

  const saveConfig = async (newConfig: AppConfig) => {
    try {
      await indexedDBService.saveConfig(newConfig);
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

  const clearConfig = async () => {
    try {
      await indexedDBService.deleteConfig();
      setConfig(null);
      setIsConfigured(false);
    } catch (error) {
      console.error('Failed to clear config:', error);
    }
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

