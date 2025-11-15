import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw } from 'lucide-react';
import { useWizardState } from '../../hooks/useWizardState';
import { useTickets } from '../../hooks/useTickets';
import { useConfig } from '../../hooks/useConfig';
import { llmService } from '../../services/llm';
import { JiraTicket } from '../../types';
import { getRandomJoke } from '../../constants/loadingJokes';

export function EpicSelection() {
  const navigate = useNavigate();
  const { state, updateWizardState } = useWizardState();
  const { tickets } = useTickets();
  const { config } = useConfig();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [relevantEpics, setRelevantEpics] = useState<Array<{ epic: JiraTicket; score: number }>>([]);
  const [joke, setJoke] = useState(getRandomJoke());

  useEffect(() => {
    if (!state.projectDescription) {
      navigate('/wizard/project');
      return;
    }

    // Configure LLM service if available
    if (config?.llm) {
      llmService.configure(config.llm);
    }

    findRelevantEpics();
  }, []);

  const findRelevantEpics = async () => {
    setLoading(true);
    setError('');
    setJoke(getRandomJoke());

    try {
      // Filter tickets to only epics
      const epics = tickets.filter((t) => t.issueType === 'Epic');

      if (epics.length === 0) {
        setRelevantEpics([]);
        setLoading(false);
        return;
      }

      const results = await llmService.findRelevantEpics(
        state.projectDescription,
        epics
      );

      setRelevantEpics(results);
    } catch (err: any) {
      console.error('Error finding relevant epics:', err);
      setError(err.message || 'Failed to find relevant epics');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEpic = (epic: JiraTicket) => {
    // Save directly to sessionStorage to ensure persistence before navigation
    try {
      const currentState = sessionStorage.getItem('jiraviz_wizard_state');
      const stateObj = currentState ? JSON.parse(currentState) : {};
      stateObj.selectedEpic = epic;
      sessionStorage.setItem('jiraviz_wizard_state', JSON.stringify(stateObj));
    } catch (err) {
      console.error('Error saving epic to sessionStorage:', err);
    }
    
    // Also update React state
    updateWizardState({ selectedEpic: epic });
    
    // Navigate to next step
    navigate('/wizard/epic-detail');
  };

  const handleCreateNew = () => {
    navigate('/wizard/epic-create');
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border p-8 text-center smooth-transition">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600 dark:text-neon-cyan" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            AI is analyzing epics...
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Matching your project description to relevant epics
          </p>
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
            <p className="text-sm text-blue-800 dark:text-blue-200">{joke}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border p-8 smooth-transition">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Select an Epic
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          AI has ranked epics by relevance to your project description
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg animate-fade-in">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {relevantEpics.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-dark-surface mb-4">
              <Plus className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No relevant epics found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Create a new epic to organize your work
            </p>
            <button
              onClick={handleCreateNew}
              className="px-6 py-3 bg-blue-600 dark:bg-neon-cyan text-white dark:text-gray-900 rounded-lg hover:bg-blue-700 dark:hover:bg-cyan-400 font-medium shadow-lg dark:shadow-glow-cyan smooth-transition"
            >
              Create New Epic
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              {relevantEpics.slice(0, 10).map(({ epic, score }) => (
                <button
                  key={epic.id}
                  onClick={() => handleSelectEpic(epic)}
                  className="w-full text-left p-4 border-2 border-gray-200 dark:border-dark-border rounded-lg hover:border-blue-500 dark:hover:border-neon-cyan hover:bg-gray-50 dark:hover:bg-dark-surface smooth-transition group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-neon-cyan">
                        {epic.key}
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                          {Math.round(score * 100)}% match
                        </span>
                      </span>
                    </div>
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1 group-hover:text-blue-600 dark:group-hover:text-neon-cyan smooth-transition">
                    {epic.summary}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {epic.description || 'No description'}
                  </p>
                </button>
              ))}
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-dark-border">
              <button
                onClick={handleCreateNew}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 border-2 border-dashed border-gray-300 dark:border-dark-border text-gray-700 dark:text-gray-300 rounded-lg hover:border-blue-500 dark:hover:border-neon-cyan hover:bg-gray-50 dark:hover:bg-dark-surface smooth-transition"
              >
                <Plus className="w-5 h-5" />
                Didn't Find - Create New Epic
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

