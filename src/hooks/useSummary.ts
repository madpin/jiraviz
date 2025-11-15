import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { JiraTicket, TicketSummary, SummaryType } from '../types';
import { db } from '../services/database';
import { llmService } from '../services/llm';
import { jiraService } from '../services/jira';
import { useConfig } from './useConfig';

export function useSummary(ticketId?: string) {
  const { config } = useConfig();
  const [cachedSummary, setCachedSummary] = useState<TicketSummary | null>(null);
  const [isLoadingCache, setIsLoadingCache] = useState(false);

  useEffect(() => {
    if (config?.llm) {
      llmService.configure(config.llm);
    }
  }, [config]);

  useEffect(() => {
    if (ticketId) {
      loadCachedSummary(ticketId, 'individual');
    }
  }, [ticketId]);

  const loadCachedSummary = async (id: string, type: SummaryType) => {
    setIsLoadingCache(true);
    try {
      const summary = await db.getSummary(id, type);
      setCachedSummary(summary);
    } catch (error) {
      console.error('Failed to load cached summary:', error);
    } finally {
      setIsLoadingCache(false);
    }
  };

  const generateSummaryMutation = useMutation({
    mutationFn: async ({ ticket, withComments }: { ticket: JiraTicket; withComments: boolean }) => {
      if (!config?.llm) {
        throw new Error('LLM not configured');
      }

      let comments: string[] | undefined;
      if (withComments) {
        try {
          const jiraComments = await jiraService.getComments(ticket.key);
          comments = jiraComments.map(c => `${c.author}: ${c.body}`);
        } catch (error) {
          console.error('Failed to fetch comments:', error);
          comments = undefined;
        }
      }

      const content = await llmService.summarizeTicket(ticket, comments);
      
      const summary: TicketSummary = {
        id: `${ticket.id}_${Date.now()}`,
        ticketId: ticket.id,
        type: 'individual',
        content,
        createdAt: new Date().toISOString(),
      };

      await db.saveSummary(summary);
      setCachedSummary(summary);
      
      return summary;
    },
  });

  const generateAggregatedSummaryMutation = useMutation({
    mutationFn: async (tickets: JiraTicket[]) => {
      if (!config?.llm) {
        throw new Error('LLM not configured');
      }

      const content = await llmService.summarizeAggregated(tickets);
      
      // Use a combined ID for aggregated summaries
      const combinedId = tickets.map(t => t.id).sort().join('_');
      const summary: TicketSummary = {
        id: `agg_${Date.now()}`,
        ticketId: combinedId,
        type: 'aggregated',
        content,
        createdAt: new Date().toISOString(),
      };

      await db.saveSummary(summary);
      
      return summary;
    },
  });

  return {
    cachedSummary,
    isLoadingCache,
    generateSummary: generateSummaryMutation.mutateAsync,
    generateAggregatedSummary: generateAggregatedSummaryMutation.mutateAsync,
    isGenerating: generateSummaryMutation.isPending || generateAggregatedSummaryMutation.isPending,
  };
}

