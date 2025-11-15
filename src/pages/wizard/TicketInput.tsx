import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, RefreshCw } from 'lucide-react';
import { useWizardState } from '../../hooks/useWizardState';
import { useConfig } from '../../hooks/useConfig';
import { llmService } from '../../services/llm';
import { knowledgeBaseService } from '../../services/knowledgeBase';
import { TICKET_TEMPLATES } from '../../constants/ticketTemplates';
import { getRandomJoke } from '../../constants/loadingJokes';

export function TicketInput() {
  const navigate = useNavigate();
  const { state, updateWizardState } = useWizardState();
  const { config } = useConfig();
  const [ticketDescription, setTicketDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [joke, setJoke] = useState(getRandomJoke());

  useEffect(() => {
    if (!state.selectedEpic || !state.selectedTemplate) {
      navigate('/wizard/template');
    }
    
    // Configure LLM service if available
    if (config?.llm) {
      llmService.configure(config.llm);
    }
  }, []);

  const template = state.selectedTemplate ? TICKET_TEMPLATES[state.selectedTemplate] : null;

  if (!template) {
    return null;
  }

  const handleGenerate = async () => {
    if (!ticketDescription.trim()) {
      setError('Please enter a ticket description');
      return;
    }

    setLoading(true);
    setError('');
    setJoke(getRandomJoke());

    try {
      // Search knowledge base (will return placeholder in browser)
      const kbContext = await knowledgeBaseService.search(ticketDescription);

      // No Glean in browser environment
      const gleanContext = '';

      // Enhance ticket with AI
      const { summary, description } = await llmService.enhanceTicket(
        ticketDescription,
        template.prompt,
        kbContext,
        gleanContext
      );

      updateWizardState({
        generatedTicket: {
          summary,
          description,
          issueType: template.issueType,
        },
      });

      navigate('/wizard/ticket-review');
    } catch (err: any) {
      console.error('Error generating ticket:', err);
      setError(err.message || 'Failed to generate ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'g' && e.ctrlKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border p-8 text-center smooth-transition">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600 dark:text-neon-cyan" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            AI is enhancing your ticket...
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Searching knowledge base and generating structured description
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
          Create Ticket
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-2">
          Epic: <span className="font-mono text-blue-600 dark:text-neon-cyan">{state.selectedEpic?.key}</span> · 
          Template: <span className="font-semibold">{template.name}</span>
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
          {template.description}
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg animate-fade-in">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Describe your ticket *
            </label>
            <textarea
              value={ticketDescription}
              onChange={(e) => {
                setTicketDescription(e.target.value);
                setError('');
              }}
              onKeyDown={handleKeyDown}
              placeholder="Share context, users, acceptance criteria, and constraints...&#10;&#10;Example: Add a button to export user data as CSV. Users should be able to click the export button and download all their data..."
              rows={10}
              className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-neon-cyan focus:border-transparent smooth-transition placeholder-gray-400 dark:placeholder-gray-500"
              autoFocus
            />
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Need inspiration? Paste scrum notes or bullet points as-is
            </p>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={handleGenerate}
              disabled={loading || !ticketDescription.trim()}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 dark:bg-neon-cyan text-white dark:text-gray-900 rounded-lg hover:bg-blue-700 dark:hover:bg-cyan-400 font-medium shadow-lg dark:shadow-glow-cyan smooth-transition disabled:opacity-50"
            >
              <Sparkles className="w-5 h-5" />
              Generate with AI
            </button>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Press Ctrl + G to generate
          </p>
        </div>
      </div>
    </div>
  );
}

