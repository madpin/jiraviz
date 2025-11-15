import { useState, useEffect, useMemo } from 'react'
import { Settings } from './components/Settings'
import { VisualTreeView } from './components/VisualTreeView'
import { TicketDetail } from './components/TicketDetail'
import { CreateTicket } from './components/CreateTicket'
import { RelationshipDebugger } from './components/RelationshipDebugger'
import { Toast, ToastType } from './components/Toast'
import { useConfig } from './hooks/useConfig'
import { usePreferences } from './hooks/usePreferences'
import { useTickets } from './hooks/useTickets'
import { JiraTicket } from './types'
import { RefreshCw, Settings as SettingsIcon, Plus, X } from 'lucide-react'

interface ToastMessage {
  message: string;
  type: ToastType;
  id: number;
}

function App() {
  const [showSettings, setShowSettings] = useState(false)
  const [showCreateTicket, setShowCreateTicket] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<JiraTicket | null>(null)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [selectedComponents, setSelectedComponents] = useState<string[]>([])
  const { config, isConfigured, reloadConfig } = useConfig()
  const { preferences } = usePreferences()
  const { tickets, isLoading, refetch, syncWithJira } = useTickets()

  const showToast = (message: string, type: ToastType) => {
    const id = Date.now()
    setToasts(prev => [...prev, { message, type, id }])
  }

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  useEffect(() => {
    if (!isConfigured) {
      setShowSettings(true)
    }
  }, [isConfigured])

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

  // Extract all unique components from tickets
  const availableComponents = useMemo(() => {
    const componentsSet = new Set<string>()
    tickets.forEach(ticket => {
      ticket.components.forEach(component => {
        if (component) componentsSet.add(component)
      })
    })
    return Array.from(componentsSet).sort()
  }, [tickets])

  // Filter tickets based on selected components
  const filteredTickets = useMemo(() => {
    if (selectedComponents.length === 0) {
      return tickets
    }
    return tickets.filter(ticket => 
      ticket.components.some(component => selectedComponents.includes(component))
    )
  }, [tickets, selectedComponents])

  const toggleComponent = (component: string) => {
    setSelectedComponents(prev => 
      prev.includes(component)
        ? prev.filter(c => c !== component)
        : [...prev, component]
    )
  }

  const clearComponentFilter = () => {
    setSelectedComponents([])
  }

  const detailPanelWidth = `${preferences.layout.detailPanelWidth}%`;

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
              onClick={() => setShowCreateTicket(true)}
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

        {/* Component Filter Section */}
        {availableComponents.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-surface smooth-transition">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Filter by Components:
              </span>
              <div className="flex items-center gap-2 flex-wrap flex-1">
                {availableComponents.map(component => (
                  <button
                    key={component}
                    onClick={() => toggleComponent(component)}
                    className={`
                      px-3 py-1 text-xs rounded-full border smooth-transition
                      ${selectedComponents.includes(component)
                        ? 'bg-blue-600 dark:bg-neon-cyan text-white dark:text-gray-900 border-blue-600 dark:border-neon-cyan shadow-md'
                        : 'bg-white dark:bg-dark-card text-gray-700 dark:text-gray-300 border-gray-300 dark:border-dark-border hover:border-blue-400 dark:hover:border-cyan-400'
                      }
                    `}
                  >
                    {component}
                  </button>
                ))}
              </div>
              {selectedComponents.length > 0 && (
                <button
                  onClick={clearComponentFilter}
                  className="flex items-center gap-1 px-3 py-1 text-xs bg-gray-200 dark:bg-dark-border text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 smooth-transition"
                >
                  <X className="w-3 h-3" />
                  Clear ({selectedComponents.length})
                </button>
              )}
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
                <RelationshipDebugger tickets={filteredTickets} />
              </div>

              {/* Visual Tree */}
              <div>
                <div className="flex items-center justify-between px-6 pt-6 pb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Ticket Hierarchy</h2>
                  {selectedComponents.length > 0 && (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Showing {filteredTickets.length} of {tickets.length} tickets
                    </span>
                  )}
                </div>
                <div className="bg-white dark:bg-dark-card mx-6 rounded-lg shadow-sm border border-gray-200 dark:border-dark-border smooth-transition">
                  <VisualTreeView
                    tickets={filteredTickets}
                    selectedTicket={selectedTicket}
                    onSelectTicket={setSelectedTicket}
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

      {/* Create Ticket Modal */}
      {showCreateTicket && (
        <CreateTicket
          onClose={() => setShowCreateTicket(false)}
          onSuccess={() => {
            handleSync(false)
          }}
        />
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
