import { useState, useEffect } from 'react';
import { useConfig } from '../hooks/useConfig';
import { usePreferences } from '../hooks/usePreferences';
import { AppConfig, ThemeMode, AccentColor, Density, FontSize, AnimationSpeed, DetailPanelPosition, TreeViewStyle } from '../types';
import { X, Save, Settings as SettingsIcon, Palette, Layout, Database, RotateCcw, RefreshCw, Trash2, AlertTriangle } from 'lucide-react';
import { clearLocalDatabase } from '../utils/clearDatabase';

interface SettingsProps {
  onClose: () => void;
}

type TabType = 'jira' | 'llm' | 'sync' | 'visual' | 'layout' | 'data';

export function Settings({ onClose }: SettingsProps) {
  const { config, saveConfig } = useConfig();
  const { preferences, updateVisualPreferences, updateLayoutPreferences, updateDataDisplayPreferences, resetPreferences } = usePreferences();
  
  const [activeTab, setActiveTab] = useState<TabType>('jira');
  
  // Jira & LLM settings
  const [jiraUrl, setJiraUrl] = useState('');
  const [jiraToken, setJiraToken] = useState('');
  const [jiraEmail, setJiraEmail] = useState('');
  const [jiraProject, setJiraProject] = useState('EVO');
  
  const [llmBaseUrl, setLlmBaseUrl] = useState('https://api.openai.com/v1');
  const [llmApiKey, setLlmApiKey] = useState('');
  const [llmModel, setLlmModel] = useState('gpt-5-mini');
  const [llmHeaders, setLlmHeaders] = useState('');

  const [syncComments, setSyncComments] = useState(true);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (config) {
      setJiraUrl(config.jira?.url || '');
      setJiraToken(config.jira?.token || '');
      setJiraEmail(config.jira?.userEmail || '');
      setJiraProject(config.jira?.defaultProject || 'EVO');
      
      setLlmBaseUrl(config.llm?.baseUrl || 'https://api.openai.com/v1');
      setLlmApiKey(config.llm?.apiKey || '');
      setLlmModel(config.llm?.model || 'gpt-5-mini');
      setLlmHeaders(JSON.stringify(config.llm?.headers || {}, null, 2));

      setSyncComments(config.sync?.syncComments ?? true);
    }
  }, [config]);

  const handleSaveConfig = () => {
    setError('');
    setSuccess(false);

    try {
      // Validate inputs
      if (!jiraUrl || !jiraToken || !jiraEmail || !jiraProject) {
        setError('Please fill in all Jira fields');
        return;
      }

      if (!llmApiKey || !llmModel) {
        setError('Please fill in LLM API key and model');
        return;
      }

      let headers = {};
      if (llmHeaders.trim()) {
        try {
          headers = JSON.parse(llmHeaders);
        } catch (e) {
          setError('Invalid JSON format for LLM headers');
          return;
        }
      }

      const newConfig: AppConfig = {
        jira: {
          url: jiraUrl.trim(),
          token: jiraToken.trim(),
          userEmail: jiraEmail.trim(),
          defaultProject: jiraProject.trim(),
        },
        llm: {
          baseUrl: llmBaseUrl.trim(),
          apiKey: llmApiKey.trim(),
          model: llmModel.trim(),
          headers,
        },
        sync: {
          syncComments,
        },
      };

      saveConfig(newConfig);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
      }, 2000);
    } catch (err) {
      setError('Failed to save configuration');
      console.error(err);
    }
  };

  const handleResetPreferences = () => {
    if (confirm('Reset all preferences to defaults?')) {
      resetPreferences();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    }
  };

  const tabs = [
    { id: 'jira' as const, label: 'Jira', icon: SettingsIcon },
    { id: 'llm' as const, label: 'LLM', icon: SettingsIcon },
    { id: 'sync' as const, label: 'Sync', icon: RefreshCw },
    { id: 'visual' as const, label: 'Visual', icon: Palette },
    { id: 'layout' as const, label: 'Layout', icon: Layout },
    { id: 'data' as const, label: 'Data Display', icon: Database },
  ];

  const accentColors: { value: AccentColor; label: string; class: string }[] = [
    { value: 'cyan', label: 'Cyan', class: 'bg-neon-cyan' },
    { value: 'purple', label: 'Purple', class: 'bg-neon-purple' },
    { value: 'green', label: 'Green', class: 'bg-neon-green' },
    { value: 'pink', label: 'Pink', class: 'bg-neon-pink' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg py-8 px-4 smooth-transition">
      <div className="max-w-4xl mx-auto bg-white dark:bg-dark-card rounded-lg shadow-xl smooth-transition">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-dark-border">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-surface smooth-transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-dark-border">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 smooth-transition ${
                  activeTab === tab.id
                    ? 'border-blue-600 dark:border-neon-cyan text-blue-600 dark:text-neon-cyan'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6 space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto">
          {/* Jira Configuration Tab */}
          {activeTab === 'jira' && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Jira Configuration</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Jira URL
                </label>
                <input
                  type="text"
                  value={jiraUrl}
                  onChange={(e) => setJiraUrl(e.target.value)}
                  placeholder="https://your-domain.atlassian.net"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-neon-cyan focus:border-transparent smooth-transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={jiraEmail}
                  onChange={(e) => setJiraEmail(e.target.value)}
                  placeholder="your-email@example.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-neon-cyan focus:border-transparent smooth-transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  API Token
                </label>
                <input
                  type="password"
                  value={jiraToken}
                  onChange={(e) => setJiraToken(e.target.value)}
                  placeholder="Your Jira API token"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-neon-cyan focus:border-transparent smooth-transition"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Generate an API token at{' '}
                  <a
                    href="https://id.atlassian.com/manage-profile/security/api-tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-neon-cyan hover:underline"
                  >
                    Atlassian Account Settings
                  </a>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Default Project Key
                </label>
                <input
                  type="text"
                  value={jiraProject}
                  onChange={(e) => setJiraProject(e.target.value)}
                  placeholder="EVO"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-neon-cyan focus:border-transparent smooth-transition"
                />
              </div>
            </div>
          )}

          {/* LLM Configuration Tab */}
          {activeTab === 'llm' && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">LLM Configuration</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Base URL
                </label>
                <input
                  type="text"
                  value={llmBaseUrl}
                  onChange={(e) => setLlmBaseUrl(e.target.value)}
                  placeholder="https://api.openai.com/v1"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-neon-cyan focus:border-transparent smooth-transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  API Key
                </label>
                <input
                  type="password"
                  value={llmApiKey}
                  onChange={(e) => setLlmApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-neon-cyan focus:border-transparent smooth-transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Model
                </label>
                <input
                  type="text"
                  value={llmModel}
                  onChange={(e) => setLlmModel(e.target.value)}
                  placeholder="gpt-5-mini"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-neon-cyan focus:border-transparent smooth-transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Custom Headers (JSON)
                </label>
                <textarea
                  value={llmHeaders}
                  onChange={(e) => setLlmHeaders(e.target.value)}
                  placeholder='{\n  "X-Custom-Header": "value"\n}'
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-neon-cyan focus:border-transparent font-mono text-sm smooth-transition"
                />
              </div>
            </div>
          )}

          {/* Sync Preferences Tab */}
          {activeTab === 'sync' && (
            <div className="space-y-4 animate-fade-in">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Sync Preferences</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Configure what data to sync from Jira
              </p>

              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-dark-border">
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block">Sync Comments</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Fetch and display ticket comments from Jira
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={syncComments}
                    onChange={(e) => setSyncComments(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Note:</strong> Changes to sync preferences will take effect on the next sync operation.
                </p>
              </div>
            </div>
          )}

          {/* Visual Preferences Tab */}
          {activeTab === 'visual' && (
            <div className="space-y-6 animate-fade-in">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Visual Preferences</h3>
              
              {/* Theme Mode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Theme Mode
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['light', 'dark', 'system'] as ThemeMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => updateVisualPreferences({ theme: mode })}
                      className={`px-4 py-3 rounded-lg border-2 text-sm font-medium capitalize smooth-transition ${
                        preferences.visual.theme === mode
                          ? 'border-blue-600 dark:border-neon-cyan bg-blue-50 dark:bg-dark-surface text-blue-700 dark:text-neon-cyan'
                          : 'border-gray-300 dark:border-dark-border bg-white dark:bg-dark-surface text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Accent Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Accent Color
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {accentColors.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => updateVisualPreferences({ accentColor: color.value })}
                      className={`flex flex-col items-center gap-2 px-4 py-3 rounded-lg border-2 smooth-transition ${
                        preferences.visual.accentColor === color.value
                          ? 'border-gray-900 dark:border-gray-100 bg-gray-50 dark:bg-dark-surface'
                          : 'border-gray-300 dark:border-dark-border bg-white dark:bg-dark-surface hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full ${color.class}`} />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{color.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Density */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Density
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['compact', 'comfortable', 'spacious'] as Density[]).map((density) => (
                    <button
                      key={density}
                      onClick={() => updateVisualPreferences({ density })}
                      className={`px-4 py-3 rounded-lg border-2 text-sm font-medium capitalize smooth-transition ${
                        preferences.visual.density === density
                          ? 'border-blue-600 dark:border-neon-cyan bg-blue-50 dark:bg-dark-surface text-blue-700 dark:text-neon-cyan'
                          : 'border-gray-300 dark:border-dark-border bg-white dark:bg-dark-surface text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                    >
                      {density}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Font Size
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['small', 'medium', 'large'] as FontSize[]).map((size) => (
                    <button
                      key={size}
                      onClick={() => updateVisualPreferences({ fontSize: size })}
                      className={`px-4 py-3 rounded-lg border-2 text-sm font-medium capitalize smooth-transition ${
                        preferences.visual.fontSize === size
                          ? 'border-blue-600 dark:border-neon-cyan bg-blue-50 dark:bg-dark-surface text-blue-700 dark:text-neon-cyan'
                          : 'border-gray-300 dark:border-dark-border bg-white dark:bg-dark-surface text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Animation Speed */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Animation Speed
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['reduced', 'normal', 'enhanced'] as AnimationSpeed[]).map((speed) => (
                    <button
                      key={speed}
                      onClick={() => updateVisualPreferences({ animationSpeed: speed })}
                      className={`px-4 py-3 rounded-lg border-2 text-sm font-medium capitalize smooth-transition ${
                        preferences.visual.animationSpeed === speed
                          ? 'border-blue-600 dark:border-neon-cyan bg-blue-50 dark:bg-dark-surface text-blue-700 dark:text-neon-cyan'
                          : 'border-gray-300 dark:border-dark-border bg-white dark:bg-dark-surface text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                    >
                      {speed}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Layout Preferences Tab */}
          {activeTab === 'layout' && (
            <div className="space-y-6 animate-fade-in">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Layout Preferences</h3>
              
              {/* Detail Panel Position */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Detail Panel Position
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['right', 'bottom', 'floating'] as DetailPanelPosition[]).map((position) => (
                    <button
                      key={position}
                      onClick={() => updateLayoutPreferences({ detailPanelPosition: position })}
                      className={`px-4 py-3 rounded-lg border-2 text-sm font-medium capitalize smooth-transition ${
                        preferences.layout.detailPanelPosition === position
                          ? 'border-blue-600 dark:border-neon-cyan bg-blue-50 dark:bg-dark-surface text-blue-700 dark:text-neon-cyan'
                          : 'border-gray-300 dark:border-dark-border bg-white dark:bg-dark-surface text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                    >
                      {position}
                    </button>
                  ))}
                </div>
              </div>

              {/* Detail Panel Width */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Detail Panel Width ({preferences.layout.detailPanelWidth}%)
                </label>
                <input
                  type="range"
                  min="25"
                  max="50"
                  value={preferences.layout.detailPanelWidth}
                  onChange={(e) => updateLayoutPreferences({ detailPanelWidth: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>

              {/* Tree View Style */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tree View Style
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['card', 'list', 'compact'] as TreeViewStyle[]).map((style) => (
                    <button
                      key={style}
                      onClick={() => updateLayoutPreferences({ treeViewStyle: style })}
                      className={`px-4 py-3 rounded-lg border-2 text-sm font-medium capitalize smooth-transition ${
                        preferences.layout.treeViewStyle === style
                          ? 'border-blue-600 dark:border-neon-cyan bg-blue-50 dark:bg-dark-surface text-blue-700 dark:text-neon-cyan'
                          : 'border-gray-300 dark:border-dark-border bg-white dark:bg-dark-surface text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-dark-border">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Collapsible Sidebar</span>
                  <input
                    type="checkbox"
                    checked={preferences.layout.sidebarCollapsible}
                    onChange={(e) => updateLayoutPreferences({ sidebarCollapsible: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
                <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-dark-border">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Remember Panel Sizes</span>
                  <input
                    type="checkbox"
                    checked={preferences.layout.rememberPanelSizes}
                    onChange={(e) => updateLayoutPreferences({ rememberPanelSizes: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Data Display Preferences Tab */}
          {activeTab === 'data' && (
            <div className="space-y-6 animate-fade-in">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Data Display Preferences</h3>
              
              {/* Visible Fields */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Visible Ticket Fields
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'showAssignee' as const, label: 'Assignee' },
                    { key: 'showPriority' as const, label: 'Priority' },
                    { key: 'showLabels' as const, label: 'Labels' },
                    { key: 'showDueDate' as const, label: 'Due Date' },
                    { key: 'showDescription' as const, label: 'Description' },
                    { key: 'showTicketCounts' as const, label: 'Ticket Counts' },
                    { key: 'showIcons' as const, label: 'Icons' },
                  ].map((field) => (
                    <label
                      key={field.key}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-dark-border smooth-transition hover:border-gray-300 dark:hover:border-gray-500 cursor-pointer"
                    >
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{field.label}</span>
                      <input
                        type="checkbox"
                        checked={preferences.dataDisplay[field.key]}
                        onChange={(e) => updateDataDisplayPreferences({ [field.key]: e.target.checked })}
                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Date Format */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date Format
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['short', 'long', 'relative'] as const).map((format) => (
                    <button
                      key={format}
                      onClick={() => updateDataDisplayPreferences({ dateFormat: format })}
                      className={`px-4 py-3 rounded-lg border-2 text-sm font-medium capitalize smooth-transition ${
                        preferences.dataDisplay.dateFormat === format
                          ? 'border-blue-600 dark:border-neon-cyan bg-blue-50 dark:bg-dark-surface text-blue-700 dark:text-neon-cyan'
                          : 'border-gray-300 dark:border-dark-border bg-white dark:bg-dark-surface text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                    >
                      {format}
                    </button>
                  ))}
                </div>
              </div>

              {/* Default Sort Order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Default Sort Order
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(['default', 'alphabetical', 'created', 'updated', 'status', 'priority', 'assignee'] as const).map((order) => (
                    <button
                      key={order}
                      onClick={() => updateDataDisplayPreferences({ defaultSortOrder: order })}
                      className={`px-4 py-3 rounded-lg border-2 text-sm font-medium capitalize smooth-transition ${
                        preferences.dataDisplay.defaultSortOrder === order
                          ? 'border-blue-600 dark:border-neon-cyan bg-blue-50 dark:bg-dark-surface text-blue-700 dark:text-neon-cyan'
                          : 'border-gray-300 dark:border-dark-border bg-white dark:bg-dark-surface text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                    >
                      {order === 'default' ? 'Smart (Owner First)' : order}
                    </button>
                  ))}
                </div>
              </div>

              {/* Database Management */}
              <div className="border-t border-gray-200 dark:border-dark-border pt-6">
                <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Database Management
                </h4>
                
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800 dark:text-amber-200">
                      <p className="font-semibold mb-1">Clear Database</p>
                      <p>If you're experiencing issues like "table has no column" errors, clearing the database will recreate it with the correct schema. All local data will be lost, but you can re-sync from Jira.</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (confirm('⚠️ Are you sure you want to clear the local database?\n\nThis will:\n- Delete all cached tickets\n- Delete all summaries\n- Require a full re-sync from Jira\n\nThis action cannot be undone.')) {
                      clearLocalDatabase();
                      setTimeout(() => {
                        window.location.reload();
                      }, 1000);
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 smooth-transition"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear Local Database
                </button>
              </div>
            </div>
          )}

          {/* Error/Success Messages */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg animate-fade-in">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg animate-fade-in">
              <p className="text-sm text-green-800 dark:text-green-200">Settings saved successfully!</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-surface">
          <button
            onClick={handleResetPreferences}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-dark-card rounded-lg hover:bg-gray-300 dark:hover:bg-dark-border smooth-transition"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Preferences
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-dark-card rounded-lg hover:bg-gray-200 dark:hover:bg-dark-border smooth-transition"
            >
              Close
            </button>
            {(activeTab === 'jira' || activeTab === 'llm' || activeTab === 'sync') && (
              <button
                onClick={handleSaveConfig}
                className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 dark:bg-neon-cyan dark:text-gray-900 rounded-lg hover:bg-blue-700 dark:hover:bg-cyan-400 smooth-transition"
              >
                <Save className="w-4 h-4" />
                Save Config
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
