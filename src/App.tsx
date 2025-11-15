import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings } from './components/Settings'
import { VisualTreeView } from './components/VisualTreeView'
import { TicketDetail } from './components/TicketDetail'
import { RelationshipDebugger } from './components/RelationshipDebugger'
import { StorageWarning } from './components/StorageWarning'
import { Toast, ToastType } from './components/Toast'
import { useConfig } from './hooks/useConfig'
import { usePreferences } from './hooks/usePreferences'
import { useTickets } from './hooks/useTickets'
import { JiraTicket, TicketFilters } from './types'
import { RefreshCw, Settings as SettingsIcon, Plus, X, Calendar, Filter } from 'lucide-react'
import { getDateRangePreset, isDateInRange, isWithinLastNDays } from './utils/dateUtils'
import { indexedDBService } from './services/indexedDB'

interface ToastMessage {
  message: string;
  type: ToastType;
  id: number;
}

function App() {
  const navigate = useNavigate()
  const [showSettings, setShowSettings] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<JiraTicket | null>(null)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [filters, setFilters] = useState<TicketFilters>({})
  const [showFilters, setShowFilters] = useState(true)
  const [activeFilterModal, setActiveFilterModal] = useState<'assignee' | 'reporter' | 'date' | 'status' | 'component' | 'other' | null>(null)
  const [storageAvailable, setStorageAvailable] = useState(true)
  const { config, isConfigured, reloadConfig, isLoading: isConfigLoading } = useConfig()
  const { preferences } = usePreferences()
  const { tickets, isLoading, refetch, syncWithJira } = useTickets()

  // Check IndexedDB availability
  useEffect(() => {
    const available = indexedDBService.isAvailable();
    setStorageAvailable(available);
    
    if (!available) {
      console.warn('⚠️ IndexedDB not available - running in memory-only mode');
      console.warn('⚠️ Data will not persist across page reloads');
    }
  }, []);

  const showToast = (message: string, type: ToastType) => {
    const id = Date.now()
    setToasts(prev => [...prev, { message, type, id }])
  }

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  useEffect(() => {
    // Only show settings automatically if config has finished loading and is not configured
    if (!isConfigLoading && !isConfigured) {
      setShowSettings(true)
    }
  }, [isConfigLoading, isConfigured])

  const handleCloseSettings = () => {
    setShowSettings(false)
    reloadConfig() // Reload config to check if it's now configured
  }

  const handleSync = async (fetchAll: boolean = false) => {
    setIsSyncing(true)
    const syncType = fetchAll ? 'all tickets' : 'epics and stories'
    showToast(`Syncing ${syncType}...`, 'info')
    
    try {
      const syncedTickets = await syncWithJira(fetchAll)
      await refetch()
      showToast(`✅ Successfully synced ${syncedTickets.length} tickets!`, 'success')
    } catch (error: any) {
      console.error('Sync failed:', error)
      const errorMessage = error?.message || 'Unknown error'
      showToast(`❌ Sync failed: ${errorMessage}`, 'error')
    } finally {
      setIsSyncing(false)
    }
  }

  // Extract unique values for filters
  const filterOptions = useMemo(() => {
    const assignees = new Set<string>()
    const reporters = new Set<string>()
    const statuses = new Set<string>()
    const components = new Set<string>()

    tickets.forEach(ticket => {
      if (ticket.assignee) assignees.add(ticket.assignee)
      if (ticket.reporter) reporters.add(ticket.reporter)
      if (ticket.status) statuses.add(ticket.status)
      ticket.components.forEach(component => {
        if (component) components.add(component)
      })
    })

    return {
      assignees: Array.from(assignees).sort(),
      reporters: Array.from(reporters).sort(),
      statuses: Array.from(statuses).sort(),
      components: Array.from(components).sort(),
    }
  }, [tickets])

  // Initialize smart status filter on mount
  useEffect(() => {
    if (tickets.length > 0 && !filters.status) {
      const closedDays = preferences.dataDisplay.closedTicketsDays
      const smartStatuses = filterOptions.statuses.filter(status => {
        const statusLower = status.toLowerCase()
        // Include all non-closed statuses
        if (!statusLower.includes('closed') && !statusLower.includes('done') && statusLower !== 'resolved') {
          return true
        }
        // For closed tickets, check if any were closed recently
        const recentlyClosed = tickets.some(t => 
          t.status === status && 
          t.resolutionDate && 
          isWithinLastNDays(t.resolutionDate, closedDays)
        )
        return recentlyClosed
      })
      
      if (smartStatuses.length > 0) {
        setFilters(prev => ({ ...prev, status: smartStatuses }))
      }
    }
  }, [tickets.length, filterOptions.statuses, preferences.dataDisplay.closedTicketsDays])

  const toggleFilter = <K extends keyof TicketFilters>(
    key: K,
    value: string
  ) => {
    setFilters(prev => {
      const currentValues = (prev[key] as string[]) || []
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value]
      return { ...prev, [key]: newValues.length > 0 ? newValues as any : undefined }
    })
  }

  const setDatePreset = (preset: string) => {
    const range = getDateRangePreset(preset)
    setFilters(prev => ({
      ...prev,
      dateFrom: range.from,
      dateTo: range.to,
    }))
  }

  const clearAllFilters = () => {
    setFilters({})
  }

  const getActiveFilterCount = () => {
    let count = 0
    if (filters.assignee?.length) count++
    if (filters.reporter?.length) count++
    if (filters.status?.length) count++
    if (filters.dateFrom || filters.dateTo) count++
    if (filters.search) count++
    if (filters.minComments) count++
    if (filters.hideEmptyParents) count++
    if (filters.component?.length) count++
    return count
  }

  const hasActiveFilters = getActiveFilterCount() > 0

  const detailPanelWidth = `${preferences.layout.detailPanelWidth}%`;

  // Show loading state while config is being loaded
  if (isConfigLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex items-center justify-center smooth-transition">
        <div className="text-center glassmorphism p-8 rounded-2xl border border-gray-200 dark:border-dark-border shadow-xl">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600 dark:text-neon-cyan" />
          <p className="text-gray-600 dark:text-gray-300">Loading configuration...</p>
        </div>
      </div>
    )
  }

  if (showSettings) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg smooth-transition">
        <Settings onClose={handleCloseSettings} />
      </div>
    )
  }

  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex items-center justify-center smooth-transition">
          <div className="text-center glassmorphism p-8 rounded-2xl border border-gray-200 dark:border-dark-border shadow-xl">
          <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-gray-100 text-glow">Welcome to JiraViz</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">Please configure your Jira and LLM settings to get started.</p>
          <button
            onClick={() => setShowSettings(true)}
            className="px-6 py-3 bg-blue-600 dark:bg-neon-cyan dark:text-gray-900 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-cyan-400 shadow-lg dark:shadow-glow-cyan smooth-transition"
          >
            Configure Settings
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-dark-bg smooth-transition">
      {/* Storage Warning Banner */}
      {!storageAvailable && <StorageWarning />}
      
      {/* Header */}
      <header className="bg-white dark:bg-dark-card shadow-sm border-b border-gray-200 dark:border-dark-border smooth-transition">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-neon-cyan dark:to-neon-purple bg-clip-text text-transparent">
              JiraViz
            </h1>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Project: <span className="font-semibold text-gray-900 dark:text-gray-100">{config?.jira?.defaultProject || 'EVO'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/wizard/project')}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 dark:bg-neon-green dark:text-gray-900 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-400 shadow-lg dark:shadow-glow-green smooth-transition"
            >
              <Plus className="w-4 h-4" />
              New Ticket
            </button>
            <div className="relative group">
              <button
                onClick={() => handleSync(false)}
                disabled={isLoading || isSyncing}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 dark:bg-neon-cyan dark:text-gray-900 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-cyan-400 disabled:opacity-50 shadow-lg dark:shadow-glow-cyan smooth-transition"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading || isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync Epics'}
              </button>
              <div className="absolute right-0 mt-1 hidden group-hover:block z-10">
                <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg shadow-xl py-1 min-w-[160px] smooth-transition">
                  <button
                    onClick={() => handleSync(false)}
                    disabled={isLoading || isSyncing}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-surface disabled:opacity-50 smooth-transition"
                  >
                    Sync Epics & Stories
                  </button>
                  <button
                    onClick={() => handleSync(true)}
                    disabled={isLoading || isSyncing}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-surface disabled:opacity-50 smooth-transition"
                  >
                    Sync All Tickets
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setShowSettings(true)
                reloadConfig()
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-200 dark:bg-dark-surface text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-dark-border smooth-transition"
            >
              <SettingsIcon className="w-4 h-4" />
              Settings
            </button>
          </div>
        </div>

        {/* Filter Bar - Single Line */}
          <div className="px-6 py-3 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-surface smooth-transition">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="flex items-center gap-2 min-w-0 flex-1 max-w-md">
              <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <input
                type="text"
                value={filters.search || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value || undefined }))}
                placeholder="Search tickets..."
                className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-neon-cyan focus:border-transparent smooth-transition placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            {/* Filter Buttons */}
                  <button
              onClick={() => setActiveFilterModal('assignee')}
              className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border smooth-transition ${
                filters.assignee?.length
                  ? 'bg-blue-600 dark:bg-neon-cyan text-white dark:text-gray-900 border-blue-600 dark:border-neon-cyan'
                        : 'bg-white dark:bg-dark-card text-gray-700 dark:text-gray-300 border-gray-300 dark:border-dark-border hover:border-blue-400 dark:hover:border-cyan-400'
              }`}
            >
              👤 Assignee {filters.assignee?.length ? `(${filters.assignee.length})` : ''}
            </button>

            <button
              onClick={() => setActiveFilterModal('reporter')}
              className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border smooth-transition ${
                filters.reporter?.length
                  ? 'bg-purple-600 dark:bg-neon-purple text-white dark:text-gray-900 border-purple-600 dark:border-neon-purple'
                  : 'bg-white dark:bg-dark-card text-gray-700 dark:text-gray-300 border-gray-300 dark:border-dark-border hover:border-purple-400 dark:hover:border-purple-400'
              }`}
            >
              👨‍💼 Reporter {filters.reporter?.length ? `(${filters.reporter.length})` : ''}
            </button>

            <button
              onClick={() => setActiveFilterModal('date')}
              className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border smooth-transition ${
                filters.dateFrom || filters.dateTo
                  ? 'bg-green-600 dark:bg-neon-green text-white dark:text-gray-900 border-green-600 dark:border-neon-green'
                  : 'bg-white dark:bg-dark-card text-gray-700 dark:text-gray-300 border-gray-300 dark:border-dark-border hover:border-green-400 dark:hover:border-green-400'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Date Range {filters.dateFrom || filters.dateTo ? '✓' : ''}
            </button>

            <button
              onClick={() => setActiveFilterModal('status')}
              className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border smooth-transition ${
                filters.status?.length
                  ? 'bg-orange-600 dark:bg-orange-500 text-white dark:text-gray-900 border-orange-600 dark:border-orange-500'
                  : 'bg-white dark:bg-dark-card text-gray-700 dark:text-gray-300 border-gray-300 dark:border-dark-border hover:border-orange-400 dark:hover:border-orange-400'
              }`}
            >
              Status {filters.status?.length ? `(${filters.status.length})` : ''}
            </button>

            <button
              onClick={() => setActiveFilterModal('component')}
              className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border smooth-transition ${
                filters.component?.length
                  ? 'bg-teal-600 dark:bg-teal-500 text-white dark:text-gray-900 border-teal-600 dark:border-teal-500'
                  : 'bg-white dark:bg-dark-card text-gray-700 dark:text-gray-300 border-gray-300 dark:border-dark-border hover:border-teal-400 dark:hover:border-teal-400'
              }`}
            >
              🧩 Components {filters.component?.length ? `(${filters.component.length})` : ''}
            </button>

            <button
              onClick={() => setActiveFilterModal('other')}
              className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border smooth-transition ${
                filters.minComments || filters.hideEmptyParents
                  ? 'bg-pink-600 dark:bg-pink-500 text-white dark:text-gray-900 border-pink-600 dark:border-pink-500'
                  : 'bg-white dark:bg-dark-card text-gray-700 dark:text-gray-300 border-gray-300 dark:border-dark-border hover:border-pink-400 dark:hover:border-pink-400'
              }`}
            >
              More Filters {(filters.minComments || filters.hideEmptyParents) ? '✓' : ''}
            </button>

            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 border border-red-300 dark:border-red-700 smooth-transition"
              >
                <X className="w-3 h-3" />
                Clear All ({getActiveFilterCount()})
              </button>
            )}
          </div>
        </div>

        {/* Filter Modals */}
        {/* Assignee Filter Modal */}
        {activeFilterModal === 'assignee' && (
          <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm animate-fade-in" onClick={() => setActiveFilterModal(null)}>
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-2xl border border-gray-200 dark:border-dark-border p-6 max-w-md w-full mx-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Filter by Assignee</h3>
                <button onClick={() => setActiveFilterModal(null)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filterOptions.assignees.map(assignee => (
                  <label
                    key={assignee}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-surface cursor-pointer smooth-transition"
                  >
                    <input
                      type="checkbox"
                      checked={filters.assignee?.includes(assignee) || false}
                      onChange={() => toggleFilter('assignee', assignee)}
                      className="w-4 h-4 rounded border-gray-300 dark:border-dark-border text-blue-600 dark:text-neon-cyan focus:ring-blue-500 dark:focus:ring-neon-cyan"
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-100">{assignee}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Reporter Filter Modal */}
        {activeFilterModal === 'reporter' && (
          <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm animate-fade-in" onClick={() => setActiveFilterModal(null)}>
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-2xl border border-gray-200 dark:border-dark-border p-6 max-w-md w-full mx-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Filter by Reporter</h3>
                <button onClick={() => setActiveFilterModal(null)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                  <X className="w-5 h-5" />
                  </button>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filterOptions.reporters.map(reporter => (
                  <label
                    key={reporter}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-surface cursor-pointer smooth-transition"
                  >
                    <input
                      type="checkbox"
                      checked={filters.reporter?.includes(reporter) || false}
                      onChange={() => toggleFilter('reporter', reporter)}
                      className="w-4 h-4 rounded border-gray-300 dark:border-dark-border text-purple-600 dark:text-neon-purple focus:ring-purple-500 dark:focus:ring-neon-purple"
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-100">{reporter}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Date Range Filter Modal */}
        {activeFilterModal === 'date' && (
          <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm animate-fade-in" onClick={() => setActiveFilterModal(null)}>
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-2xl border border-gray-200 dark:border-dark-border p-6 max-w-md w-full mx-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Filter by Date Range</h3>
                <button onClick={() => setActiveFilterModal(null)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                {/* Date Field Toggle */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date Field</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, dateField: 'updated' }))}
                      className={`flex-1 px-3 py-2 text-sm rounded-lg border smooth-transition ${
                        (filters.dateField || 'updated') === 'updated'
                          ? 'bg-blue-600 dark:bg-neon-cyan text-white dark:text-gray-900 border-blue-600 dark:border-neon-cyan'
                          : 'bg-white dark:bg-dark-card text-gray-700 dark:text-gray-300 border-gray-300 dark:border-dark-border hover:border-blue-400'
                      }`}
                    >
                      Updated
                    </button>
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, dateField: 'created' }))}
                      className={`flex-1 px-3 py-2 text-sm rounded-lg border smooth-transition ${
                        filters.dateField === 'created'
                          ? 'bg-blue-600 dark:bg-neon-cyan text-white dark:text-gray-900 border-blue-600 dark:border-neon-cyan'
                          : 'bg-white dark:bg-dark-card text-gray-700 dark:text-gray-300 border-gray-300 dark:border-dark-border hover:border-blue-400'
                      }`}
                    >
                      Created
                    </button>
                  </div>
                </div>

                {/* Quick Presets */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Quick Presets</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: '7 days', value: '7days' },
                      { label: '1 month', value: '1month' },
                      { label: '3 months', value: '3months' },
                      { label: '6 months', value: '6months' },
                    ].map(preset => (
                <button
                        key={preset.value}
                        onClick={() => setDatePreset(preset.value)}
                        className="px-3 py-2 text-sm bg-white dark:bg-dark-surface text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-dark-border rounded-lg hover:border-green-400 dark:hover:border-green-400 smooth-transition"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Date Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Custom Range</label>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">From</label>
                      <input
                        type="date"
                        value={filters.dateFrom || ''}
                        onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value || undefined }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card text-gray-900 dark:text-gray-100 smooth-transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">To</label>
                      <input
                        type="date"
                        value={filters.dateTo || ''}
                        onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value || undefined }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card text-gray-900 dark:text-gray-100 smooth-transition"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Status Filter Modal */}
        {activeFilterModal === 'status' && (
          <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm animate-fade-in" onClick={() => setActiveFilterModal(null)}>
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-2xl border border-gray-200 dark:border-dark-border p-6 max-w-md w-full mx-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Filter by Status</h3>
                <button onClick={() => setActiveFilterModal(null)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filterOptions.statuses.map(status => (
                  <label
                    key={status}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-surface cursor-pointer smooth-transition"
                  >
                    <input
                      type="checkbox"
                      checked={filters.status?.includes(status) || false}
                      onChange={() => toggleFilter('status', status)}
                      className="w-4 h-4 rounded border-gray-300 dark:border-dark-border text-orange-600 dark:text-orange-500 focus:ring-orange-500"
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-100">{status}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Component Filter Modal */}
        {activeFilterModal === 'component' && (
          <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm animate-fade-in" onClick={() => setActiveFilterModal(null)}>
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-2xl border border-gray-200 dark:border-dark-border p-6 max-w-md w-full mx-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Filter by Component</h3>
                <button onClick={() => setActiveFilterModal(null)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filterOptions.components.map(component => (
                  <label
                    key={component}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-surface cursor-pointer smooth-transition"
                  >
                    <input
                      type="checkbox"
                      checked={filters.component?.includes(component) || false}
                      onChange={() => toggleFilter('component', component)}
                      className="w-4 h-4 rounded border-gray-300 dark:border-dark-border text-teal-600 dark:text-teal-500 focus:ring-teal-500"
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-100">{component}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Other Filters Modal */}
        {activeFilterModal === 'other' && (
          <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm animate-fade-in" onClick={() => setActiveFilterModal(null)}>
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-2xl border border-gray-200 dark:border-dark-border p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto animate-fade-in" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">More Filters</h3>
                <button onClick={() => setActiveFilterModal(null)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                {/* Min Comments */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Minimum Comments</label>
                  <input
                    type="number"
                    min="0"
                    value={filters.minComments || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, minComments: e.target.value ? parseInt(e.target.value) : undefined }))}
                    placeholder="0"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card text-gray-900 dark:text-gray-100 smooth-transition"
                  />
                </div>

                {/* Hide Empty Parents */}
                <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-surface cursor-pointer smooth-transition">
                  <input
                    type="checkbox"
                    checked={filters.hideEmptyParents || false}
                    onChange={(e) => setFilters(prev => ({ ...prev, hideEmptyParents: e.target.checked || undefined }))}
                    className="w-4 h-4 rounded border-gray-300 dark:border-dark-border text-pink-600 focus:ring-pink-500"
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-100">Hide epics/initiatives without children</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Tree View */}
        <div className="flex-1 overflow-auto bg-gray-50 dark:bg-dark-bg smooth-transition">
          {isLoading && tickets.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center glassmorphism p-8 rounded-2xl">
                <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600 dark:text-neon-cyan" />
                <p className="text-gray-600 dark:text-gray-300">Loading tickets...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in">
              {/* Relationship Debugger */}
              <div className="px-6 pt-6">
                <RelationshipDebugger tickets={tickets} />
              </div>

              {/* Visual Tree */}
              <div>
                <div className="flex items-center justify-between px-6 pt-6 pb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Ticket Hierarchy</h2>
                </div>
                <div className="bg-white dark:bg-dark-card mx-6 rounded-lg shadow-sm border border-gray-200 dark:border-dark-border smooth-transition">
                  <VisualTreeView
                    tickets={tickets}
                    selectedTicket={selectedTicket}
                    onSelectTicket={setSelectedTicket}
                    filters={filters}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedTicket && preferences.layout.detailPanelPosition === 'right' && (
          <div 
            className="border-l border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card overflow-auto animate-slide-in-right smooth-transition"
            style={{ width: detailPanelWidth }}
          >
            <TicketDetail
              ticket={selectedTicket}
              onClose={() => setSelectedTicket(null)}
              onUpdate={refetch}
            />
          </div>
        )}
      </div>

      {/* Bottom Detail Panel */}
      {selectedTicket && preferences.layout.detailPanelPosition === 'bottom' && (
        <div className="h-1/3 border-t border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card overflow-auto animate-slide-in-bottom smooth-transition">
          <TicketDetail
            ticket={selectedTicket}
            onClose={() => setSelectedTicket(null)}
            onUpdate={refetch}
          />
        </div>
      )}

      {/* Floating Detail Panel */}
      {selectedTicket && preferences.layout.detailPanelPosition === 'floating' && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm animate-fade-in">
          <div 
            className="bg-white dark:bg-dark-card rounded-lg shadow-2xl dark:shadow-glow-cyan border border-gray-200 dark:border-dark-border overflow-hidden animate-fade-in"
            style={{ width: '80%', height: '80%', maxWidth: '1200px' }}
          >
            <TicketDetail
              ticket={selectedTicket}
              onClose={() => setSelectedTicket(null)}
              onUpdate={refetch}
            />
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  )
}

export default App
