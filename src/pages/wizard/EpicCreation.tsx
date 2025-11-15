import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, RefreshCw } from 'lucide-react';
import { useWizardState } from '../../hooks/useWizardState';
import { useConfig } from '../../hooks/useConfig';
import { llmService } from '../../services/llm';
import { jiraService } from '../../services/jira';
import { getRandomJoke } from '../../constants/loadingJokes';

const ASPECT_OPTIONS = [
  { id: 'ktlo', label: 'KTLO (Keep The Lights On)', description: 'Maintenance and operational work' },
  { id: 'feature', label: 'New Feature', description: 'Substantial additions to functionality' },
  { id: 'phase', label: 'New Phase', description: 'Next phase or milestone of the project' },
  { id: 'other', label: 'Other', description: 'Custom aspect of the project' },
];

export function EpicCreation() {
  const navigate = useNavigate();
  const { state, updateWizardState } = useWizardState();
  const { config } = useConfig();
  const [selectedAspect, setSelectedAspect] = useState('ktlo');
  const [aspectDetails, setAspectDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [joke, setJoke] = useState(getRandomJoke());

  useEffect(() => {
    if (!state.projectDescription) {
      navigate('/wizard/project');
    }
    
    // Configure LLM service if available
    if (config?.llm) {
      llmService.configure(config.llm);
    }
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setJoke(getRandomJoke());

    try {
      // Build aspect string
      const aspectLabel = ASPECT_OPTIONS.find((a) => a.id === selectedAspect)?.label || selectedAspect;
      const aspect = aspectDetails.trim()
        ? `${aspectLabel}: ${aspectDetails.trim()}`
        : aspectLabel;

      // Generate epic with AI
      const { title, description } = await llmService.generateEpic(
        state.projectDescription,
        aspect
      );

      // Create epic in Jira
      const epicKey = await jiraService.createTicket({
        summary: title,
        description,
        issueType: 'Epic',
        projectKey: config?.jira?.defaultProject,
      });

      // Fetch the created epic
      const epic = await jiraService.getTicket(epicKey.key);

      updateWizardState({ selectedEpic: epic });
      navigate('/wizard/epic-detail');
    } catch (err: any) {
      console.error('Error creating epic:', err);
      setError(err.message || 'Failed to create epic');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border p-8 text-center smooth-transition">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600 dark:text-neon-cyan" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Creating epic with AI...
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Generating epic title and description
          </p>
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
            <p className="text-sm text-blue-800 dark:text-blue-200">{joke}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border p-8 smooth-transition">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Create New Epic
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Guide AI to draft an epic that fits your initiative
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg animate-fade-in">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              What aspect of the project will this Epic cover? *
            </label>
            <div className="space-y-2">
              {ASPECT_OPTIONS.map((option) => (
                <label
                  key={option.id}
                  className={`flex items-start p-4 border-2 rounded-lg cursor-pointer smooth-transition ${
                    selectedAspect === option.id
                      ? 'border-blue-500 dark:border-neon-cyan bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-dark-border hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="aspect"
                    value={option.id}
                    checked={selectedAspect === option.id}
                    onChange={(e) => setSelectedAspect(e.target.value)}
                    className="mt-1 w-4 h-4 text-blue-600 dark:text-neon-cyan focus:ring-blue-500 dark:focus:ring-neon-cyan"
                  />
                  <div className="ml-3">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {option.label}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {option.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Additional details (optional)
            </label>
            <input
              type="text"
              value={aspectDetails}
              onChange={(e) => setAspectDetails(e.target.value)}
              placeholder="Share context, constraints, or desired outcomes..."
              className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-neon-cyan focus:border-transparent smooth-transition placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Tip: Focus on the value this epic delivers
            </p>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 dark:bg-neon-cyan text-white dark:text-gray-900 rounded-lg hover:bg-blue-700 dark:hover:bg-cyan-400 font-medium shadow-lg dark:shadow-glow-cyan smooth-transition disabled:opacity-50"
            >
              <Sparkles className="w-5 h-5" />
              Generate Epic
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

