import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { JiraTicket } from '../types';
import { db } from '../services/database';
import { jiraService } from '../services/jira';
import { useConfig } from './useConfig';

export function useTickets() {
  const { config } = useConfig();
  const queryClient = useQueryClient();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initDb = async () => {
      try {
        await db.initialize();
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize database:', error);
      }
    };
    initDb();
  }, []);

  useEffect(() => {
    if (config?.jira) {
      jiraService.configure(config.jira);
    }
  }, [config]);

  const { data: tickets = [], isLoading, refetch } = useQuery({
    queryKey: ['tickets'],
    queryFn: async () => {
      if (!isInitialized) return [];
      return await db.getTickets();
    },
    enabled: isInitialized,
  });

  // Auto-fetch initiatives and epics when no tickets are present
  useEffect(() => {
    const autoFetch = async () => {
      if (isInitialized && config?.jira && tickets.length === 0 && !isLoading) {
        try {
          const syncComments = config?.sync?.syncComments ?? true;
          const freshTickets = await jiraService.fetchInitiativesAndEpics(config.jira.defaultProject, syncComments);
          await db.saveTickets(freshTickets);
          queryClient.invalidateQueries({ queryKey: ['tickets'] });
        } catch (error) {
          console.error('Auto-fetch failed:', error);
        }
      }
    };
    
    autoFetch();
  }, [isInitialized, config, tickets.length, isLoading, queryClient]);

  const syncWithJira = async (fetchAll: boolean = false) => {
    if (!config?.jira) {
      throw new Error('Jira not configured');
    }

    try {
      const syncComments = config?.sync?.syncComments ?? true;
      let freshTickets: JiraTicket[];
      
      if (fetchAll) {
        // Fetch all tickets in the project
        freshTickets = await jiraService.fetchTickets(config.jira.defaultProject, syncComments);
      } else {
        // Fetch only initiatives and epics with their children
        freshTickets = await jiraService.fetchInitiativesAndEpics(config.jira.defaultProject, syncComments);
      }
      
      await db.saveTickets(freshTickets);
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      return freshTickets;
    } catch (error) {
      console.error('Failed to sync with Jira:', error);
      throw error;
    }
  };

  const updateTicketMutation = useMutation({
    mutationFn: async ({ ticket, syncToJira }: { ticket: JiraTicket; syncToJira: boolean }) => {
      if (syncToJira && config?.jira) {
        await jiraService.updateTicket(ticket.key, {
          summary: ticket.summary,
          description: ticket.description || undefined,
          status: ticket.status,
          assignee: ticket.assignee || undefined,
          priority: ticket.priority || undefined,
          labels: ticket.labels,
        });
      }
      await db.updateTicket(ticket);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });

  const createTicketMutation = useMutation({
    mutationFn: async (data: {
      summary: string;
      description: string;
      issueType: string;
      parentKey?: string;
    }) => {
      if (!config?.jira) {
        throw new Error('Jira not configured');
      }
      const newTicket = await jiraService.createTicket(data);
      await syncWithJira(); // Refresh all tickets
      return newTicket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });

  const deleteTicketMutation = useMutation({
    mutationFn: async (ticketKey: string) => {
      if (!config?.jira) {
        throw new Error('Jira not configured');
      }
      await jiraService.deleteTicket(ticketKey);
      await syncWithJira(); // Refresh all tickets
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });

  return {
    tickets,
    isLoading,
    refetch,
    syncWithJira,
    updateTicket: updateTicketMutation.mutateAsync,
    createTicket: createTicketMutation.mutateAsync,
    deleteTicket: deleteTicketMutation.mutateAsync,
  };
}

