import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Users } from 'lucide-react';
import { useWizardState } from '../../hooks/useWizardState';
import { TICKET_TEMPLATES } from '../../constants/ticketTemplates';

export function TemplateSelection() {
  const navigate = useNavigate();
  const { state, updateWizardState } = useWizardState();
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!state.selectedEpic) {
      navigate('/wizard/epic-select');
    }
  }, []);

  const templates = Object.entries(TICKET_TEMPLATES);

  const handleContinue = () => {
    if (!selectedTemplate) {
      setError('Please select a template');
      return;
    }

    if (selectedTemplate === 'multi') {
      // Reset multi-ticket state
      updateWizardState({
        selectedTemplate: 'multi',
        multiTicketPlan: [],
        multiTicketDrafts: [],
      });
      navigate('/wizard/multi-input');
    } else {
      updateWizardState({ selectedTemplate });
      navigate('/wizard/ticket-input');
    }
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border p-8 smooth-transition">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Select Ticket Template
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-2">
          Choose a structure so AI can tailor the draft
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
          Epic: <span className="font-mono text-blue-600 dark:text-neon-cyan">{state.selectedEpic?.key}</span>
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg animate-fade-in">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Choose a template for your ticket:
            </label>
            <div className="space-y-2">
              {templates.map(([key, template]) => (
                <label
                  key={key}
                  className={`flex items-start p-4 border-2 rounded-lg cursor-pointer smooth-transition ${
                    selectedTemplate === key
                      ? 'border-blue-500 dark:border-neon-cyan bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-dark-border hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="template"
                    value={key}
                    checked={selectedTemplate === key}
                    onChange={(e) => {
                      setSelectedTemplate(e.target.value);
                      setError('');
                    }}
                    className="mt-1 w-4 h-4 text-blue-600 dark:text-neon-cyan focus:ring-blue-500 dark:focus:ring-neon-cyan"
                  />
                  <div className="ml-3">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {template.name}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {template.description}
                    </div>
                  </div>
                </label>
              ))}

              {/* Multi-ticket option */}
              <label
                className={`flex items-start p-4 border-2 rounded-lg cursor-pointer smooth-transition ${
                  selectedTemplate === 'multi'
                    ? 'border-purple-500 dark:border-neon-purple bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-200 dark:border-dark-border hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <input
                  type="radio"
                  name="template"
                  value="multi"
                  checked={selectedTemplate === 'multi'}
                  onChange={(e) => {
                    setSelectedTemplate(e.target.value);
                    setError('');
                  }}
                  className="mt-1 w-4 h-4 text-purple-600 dark:text-neon-purple focus:ring-purple-500 dark:focus:ring-neon-purple"
                />
                <div className="ml-3">
                  <div className="flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100">
                    <Users className="w-5 h-5" />
                    Generate Multiple Tickets
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Plan and draft many issues at once
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Not sure? Small Task is perfect for quick wins
            </p>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={handleContinue}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 dark:bg-neon-cyan text-white dark:text-gray-900 rounded-lg hover:bg-blue-700 dark:hover:bg-cyan-400 font-medium shadow-lg dark:shadow-glow-cyan smooth-transition"
            >
              Continue
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

