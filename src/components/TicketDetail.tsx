import { useState, useEffect } from 'react';
import { JiraTicket } from '../types';
import { X, Save, Sparkles, ExternalLink, Trash2, Edit2, MessageSquare } from 'lucide-react';
import { useTickets } from '../hooks/useTickets';
import { useSummary } from '../hooks/useSummary';
import { jiraService } from '../services/jira';
import { useConfig } from '../hooks/useConfig';
import { usePreferences } from '../hooks/usePreferences';
import { FormattedText } from './FormattedText';

interface TicketDetailProps {
  ticket: JiraTicket;
  onClose: () => void;
  onUpdate: () => void;
}

export function TicketDetail({ ticket, onClose, onUpdate }: TicketDetailProps) {
  const { config } = useConfig();
  const { preferences } = usePreferences();
  const { updateTicket, deleteTicket } = useTickets();
  const { cachedSummary, generateSummary, isGenerating } = useSummary(ticket.id);

  const [isEditing, setIsEditing] = useState(false);
  const [editedSummary, setEditedSummary] = useState(ticket.summary);
  const [editedDescription, setEditedDescription] = useState(ticket.description || '');
  const [editedStatus, setEditedStatus] = useState(ticket.status);
  const [saving, setSaving] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState(ticket.comments || []);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  useEffect(() => {
    setEditedSummary(ticket.summary);
    setEditedDescription(ticket.description || '');
    setEditedStatus(ticket.status);
    setComments(ticket.comments || []);
  }, [ticket]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedTicket: JiraTicket = {
        ...ticket,
        summary: editedSummary,
        description: editedDescription || null,
        status: editedStatus,
        updated: new Date().toISOString(),
      };

      await updateTicket({ ticket: updatedTicket, syncToJira: true });
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Failed to update ticket:', error);
      alert('Failed to update ticket. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ticket ${ticket.key}? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteTicket(ticket.key);
      onClose();
      onUpdate();
    } catch (error) {
      console.error('Failed to delete ticket:', error);
      alert('Failed to delete ticket. Please try again.');
    }
  };

  const handleGenerateSummary = async () => {
    try {
      await generateSummary({ ticket, withComments: showComments && comments.length > 0 });
    } catch (error) {
      console.error('Failed to generate summary:', error);
      alert('Failed to generate summary. Please check your LLM configuration.');
    }
  };

  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const fetchedComments = await jiraService.getComments(ticket.key);
      setComments(fetchedComments);
      setShowComments(true);
    } catch (error) {
      console.error('Failed to load comments:', error);
      alert('Failed to load comments.');
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      await jiraService.addComment(ticket.key, newComment);
      setNewComment('');
      await loadComments(); // Refresh comments
    } catch (error) {
      console.error('Failed to add comment:', error);
      alert('Failed to add comment.');
    }
  };

  const getJiraUrl = () => {
    if (!config?.jira?.url) return '#';
    return `${config.jira.url}/browse/${ticket.key}`;
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-dark-card smooth-transition">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border bg-gradient-to-r from-gray-50 to-gray-100 dark:from-dark-surface dark:to-dark-card">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{ticket.key}</h2>
            <a
              href={getJiraUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-neon-cyan hover:text-blue-800 dark:hover:text-cyan-400 smooth-transition"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">{ticket.issueType}</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-surface smooth-transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Summary */}
        <div className="animate-fade-in">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Summary</label>
          {isEditing ? (
            <input
              type="text"
              value={editedSummary}
              onChange={(e) => setEditedSummary(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-neon-cyan focus:border-transparent smooth-transition"
            />
          ) : (
            <p className="text-gray-900 dark:text-gray-100">{ticket.summary}</p>
          )}
        </div>

        {/* Status and Priority */}
        <div className="grid grid-cols-2 gap-4 animate-fade-in">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
            {isEditing ? (
              <select
                value={editedStatus}
                onChange={(e) => setEditedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-neon-cyan focus:border-transparent smooth-transition"
              >
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Done">Done</option>
                <option value="Blocked">Blocked</option>
              </select>
            ) : (
              <span className="inline-block px-2 py-1 text-sm bg-gray-100 dark:bg-dark-surface text-gray-700 dark:text-gray-300 rounded">
                {ticket.status}
              </span>
            )}
          </div>
          {preferences.dataDisplay.showPriority && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
              <span className="inline-block px-2 py-1 text-sm bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded">
                {ticket.priority || 'Not set'}
              </span>
            </div>
          )}
        </div>

        {/* Description */}
        {preferences.dataDisplay.showDescription && (
          <div className="animate-fade-in">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            {isEditing ? (
              <textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-neon-cyan focus:border-transparent smooth-transition"
              />
            ) : (
              <FormattedText 
                content={ticket.descriptionADF || ticket.description || 'No description provided'}
                isADF={!!ticket.descriptionADF}
                className="text-gray-700 dark:text-gray-300"
              />
            )}
          </div>
        )}

        {/* AI Summary */}
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">AI Summary</label>
            <button
              onClick={handleGenerateSummary}
              disabled={isGenerating}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-purple-600 dark:bg-neon-purple text-white dark:text-gray-900 rounded-lg hover:bg-purple-700 dark:hover:bg-purple-400 disabled:opacity-50 shadow-lg dark:shadow-glow-purple smooth-transition"
            >
              <Sparkles className={`w-3 h-3 ${isGenerating ? 'animate-pulse' : ''}`} />
              {isGenerating ? 'Generating...' : 'Generate'}
            </button>
          </div>
          {cachedSummary ? (
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg">
              <p className="text-sm text-purple-900 dark:text-purple-200">{cachedSummary.content}</p>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
                Generated {new Date(cachedSummary.createdAt).toLocaleString()}
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-300 italic">No summary generated yet</p>
          )}
        </div>

        {/* Metadata */}
        <div className="space-y-2 text-sm animate-fade-in">
          {preferences.dataDisplay.showAssignee && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Assignee:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{ticket.assignee || 'Unassigned'}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-300">Reporter:</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{ticket.reporter || 'Unknown'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-300">Created:</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{new Date(ticket.created).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-300">Updated:</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{new Date(ticket.updated).toLocaleDateString()}</span>
          </div>
          {preferences.dataDisplay.showDueDate && ticket.dueDate && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Due Date:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{new Date(ticket.dueDate).toLocaleDateString()}</span>
            </div>
          )}
          {ticket.resolution && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Resolution:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{ticket.resolution}</span>
            </div>
          )}
          {ticket.resolutionDate && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Resolved:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{new Date(ticket.resolutionDate).toLocaleDateString()}</span>
            </div>
          )}
          {ticket.timeTracking && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Time Tracking:</span>
              <span className="font-medium text-xs text-gray-900 dark:text-gray-100">
                {ticket.timeTracking.timeSpent && `Spent: ${ticket.timeTracking.timeSpent}`}
                {ticket.timeTracking.timeSpent && ticket.timeTracking.remainingEstimate && ' | '}
                {ticket.timeTracking.remainingEstimate && `Remaining: ${ticket.timeTracking.remainingEstimate}`}
              </span>
            </div>
          )}
          {ticket.attachmentCount > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Attachments:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{ticket.attachmentCount}</span>
            </div>
          )}
        </div>

        {/* Labels */}
        {preferences.dataDisplay.showLabels && ticket.labels.length > 0 && (
          <div className="animate-fade-in">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Labels</label>
            <div className="flex flex-wrap gap-2">
              {ticket.labels.map((label) => (
                <span
                  key={label}
                  className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Parent/Subtasks */}
        {(ticket.parentKey || ticket.subtasks.length > 0) && (
          <div className="space-y-2 animate-fade-in">
            {ticket.parentKey && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Parent</label>
                <span className="text-sm text-blue-600 dark:text-neon-cyan font-mono">{ticket.parentKey}</span>
              </div>
            )}
            {ticket.subtasks.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Subtasks ({ticket.subtasks.length})
                </label>
                <div className="space-y-1">
                  {ticket.subtasks.map((subtask) => (
                    <div key={subtask} className="text-sm text-blue-600 dark:text-neon-cyan font-mono">
                      {subtask}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Comments Section */}
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Comments {comments.length > 0 && `(${comments.length})`}
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setShowComments(!showComments)}
                className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-200 dark:bg-dark-surface text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-dark-border smooth-transition"
              >
                <MessageSquare className="w-3 h-3" />
                {showComments ? 'Hide' : 'Show'}
              </button>
              {showComments && (
                <button
                  onClick={loadComments}
                  disabled={loadingComments}
                  className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-200 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-300 dark:hover:bg-blue-800/40 smooth-transition"
                >
                  {loadingComments ? 'Loading...' : 'Refresh from Jira'}
                </button>
              )}
            </div>
          </div>

          {showComments && (
            <div className="space-y-3">
              {comments.length > 0 ? (
                comments.map((comment) => (
                  <div key={comment.id} className="p-3 bg-gray-50 dark:bg-dark-surface rounded-lg border border-gray-200 dark:border-dark-border">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{comment.author}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-300">
                        {new Date(comment.created).toLocaleString()}
                      </span>
                    </div>
                    <FormattedText 
                      content={comment.bodyADF || comment.body}
                      isADF={!!comment.bodyADF}
                      className="text-sm text-gray-700 dark:text-gray-300"
                    />
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-300 italic">No comments yet</p>
              )}

              {/* Add Comment */}
              <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-dark-border">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-neon-cyan focus:border-transparent text-sm smooth-transition placeholder-gray-400 dark:placeholder-gray-500"
                />
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  className="px-3 py-1 text-sm bg-blue-600 dark:bg-neon-cyan text-white dark:text-gray-900 rounded-lg hover:bg-blue-700 dark:hover:bg-cyan-400 disabled:opacity-50 smooth-transition"
                >
                  Add Comment
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-surface smooth-transition">
        <button
          onClick={handleDelete}
          className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg smooth-transition"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>

        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-dark-card rounded-lg hover:bg-gray-300 dark:hover:bg-dark-border smooth-transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 dark:bg-neon-cyan text-white dark:text-gray-900 rounded-lg hover:bg-blue-700 dark:hover:bg-cyan-400 disabled:opacity-50 shadow-lg dark:shadow-glow-cyan smooth-transition"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save'}
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 dark:bg-neon-cyan text-white dark:text-gray-900 rounded-lg hover:bg-blue-700 dark:hover:bg-cyan-400 shadow-lg dark:shadow-glow-cyan smooth-transition"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
