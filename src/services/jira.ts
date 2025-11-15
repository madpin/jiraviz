import axios, { AxiosInstance } from 'axios';
import { JiraTicket, JiraConfig, JiraComment } from '../types';

class JiraService {
  private client: AxiosInstance | null = null;
  private config: JiraConfig | null = null;

  configure(config: JiraConfig): void {
    this.config = config;
    
    // Use proxy in development, direct URL in production
    const isDevelopment = import.meta.env.DEV;
    const baseURL = isDevelopment 
      ? '/api/jira/rest/api/3'  // Use Vite proxy in development
      : `${config.url}/rest/api/3`; // Direct URL in production
    
    this.client = axios.create({
      baseURL,
      headers: {
        'Authorization': `Basic ${btoa(`${config.userEmail}:${config.token}`)}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
  }

  private ensureConfigured(): void {
    if (!this.client || !this.config) {
      throw new Error('Jira service not configured');
    }
  }

  async fetchTickets(projectKey: string = 'EVO', syncComments: boolean = true): Promise<JiraTicket[]> {
    this.ensureConfigured();

    try {
      // Fetch initiatives and epics first, then all other issues in the project
      const jql = `project = ${projectKey} ORDER BY created DESC`;
      
      const fields = [
        'summary',
        'description',
        'status',
        'issuetype',
        'priority',
        'assignee',
        'reporter',
        'created',
        'updated',
        'parent',
        'subtasks',
        'labels',
        'components',
        'duedate',
        'resolutiondate',
        'resolution',
        'timetracking',
        'attachment',
        'customfield_10014', // Epic Link (common)
        'customfield_10008', // Epic Link (alternative)
        'customfield_10010', // Epic Link (alternative)
      ];
      
      if (syncComments) {
        fields.push('comment');
      }
      
      const response = await this.client!.get('/search/jql', {
        params: {
          jql,
          maxResults: 1000,
          fields: fields.join(','),
        },
      });

      const issues = await Promise.all(
        response.data.issues.map(async (issue: any) => {
          const ticket = await this.mapIssueToTicket(issue);
          return ticket;
        })
      );

      return issues;
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
      throw error;
    }
  }

  async fetchInitiativesAndEpics(projectKey: string = 'EVO', syncComments: boolean = true): Promise<JiraTicket[]> {
    this.ensureConfigured();

    try {
      // First, try to fetch Epics (most common high-level issue type)
      // Initiative might not exist in all Jira instances
      const jql = `project = ${projectKey} AND issuetype = Epic ORDER BY created DESC`;
      
      const fields = [
        'summary',
        'description',
        'status',
        'issuetype',
        'priority',
        'assignee',
        'reporter',
        'created',
        'updated',
        'parent',
        'subtasks',
        'labels',
        'components',
        'duedate',
        'resolutiondate',
        'resolution',
        'timetracking',
        'attachment',
        'customfield_10014', // Epic Link (common)
        'customfield_10008', // Epic Link (alternative)
        'customfield_10010', // Epic Link (alternative)
      ];
      
      if (syncComments) {
        fields.push('comment');
      }
      
      const response = await this.client!.get('/search/jql', {
        params: {
          jql,
          maxResults: 1000,
          fields: fields.join(','),
        },
      });

      const epics = await Promise.all(
        response.data.issues.map(async (issue: any) => await this.mapIssueToTicket(issue))
      );
      
      let initiatives: JiraTicket[] = [];
      
      // Try to fetch Initiatives if they exist (Portfolio/Advanced Roadmaps feature)
      try {
        const initJql = `project = ${projectKey} AND issuetype = Initiative ORDER BY created DESC`;
        
        const initFields = [
          'summary',
          'description',
          'status',
          'issuetype',
          'priority',
          'assignee',
          'reporter',
          'created',
          'updated',
          'parent',
          'subtasks',
          'labels',
          'components',
          'duedate',
          'resolutiondate',
          'resolution',
          'timetracking',
          'attachment',
        ];
        
        if (syncComments) {
          initFields.push('comment');
        }
        
        const initResponse = await this.client!.get('/search/jql', {
          params: {
            jql: initJql,
            maxResults: 1000,
            fields: initFields.join(','),
          },
        });
        
        initiatives = await Promise.all(
          initResponse.data.issues.map(async (issue: any) => await this.mapIssueToTicket(issue))
        );
      } catch (error: any) {
        // Initiative type might not exist - that's okay
      }

      // Combine and deduplicate by key
      const seenKeys = new Set<string>();
      const allHighLevelIssues: JiraTicket[] = [];
      
      [...initiatives, ...epics].forEach(ticket => {
        if (!seenKeys.has(ticket.key)) {
          seenKeys.add(ticket.key);
          allHighLevelIssues.push(ticket);
        }
      });

      // Fetch all child issues (stories, tasks, subtasks, etc.) for these epics/initiatives
      if (allHighLevelIssues.length > 0) {
        const parentKeys = allHighLevelIssues.map((i: JiraTicket) => i.key);
        
        // Fetch direct children (using both parent field and Epic Link)
        // In Jira, epics can be linked via "parent" or via "Epic Link" custom field
        const childJql = `project = ${projectKey} AND (parent IN (${parentKeys.join(',')}) OR "Epic Link" IN (${parentKeys.join(',')}))`;
        
        const childFields = [
          'summary',
          'description',
          'status',
          'issuetype',
          'priority',
          'assignee',
          'reporter',
          'created',
          'updated',
          'parent',
          'subtasks',
          'labels',
          'components',
          'duedate',
          'resolutiondate',
          'resolution',
          'timetracking',
          'attachment',
        ];
        
        if (syncComments) {
          childFields.push('comment');
        }
        
        const childResponse = await this.client!.get('/search/jql', {
          params: {
            jql: childJql,
            maxResults: 2000,
            fields: childFields.join(','),
          },
        });

        const children = await Promise.all(
          childResponse.data.issues.map(async (issue: any) => await this.mapIssueToTicket(issue))
        );
        
        // Deduplicate children
        const allTickets = [...allHighLevelIssues];
        children.forEach((child: JiraTicket) => {
          if (!seenKeys.has(child.key)) {
            seenKeys.add(child.key);
            allTickets.push(child);
          }
        });
        
        // Now fetch subtasks of the children (stories -> subtasks)
        const childKeys = children.map((c: JiraTicket) => c.key);
        if (childKeys.length > 0) {
          const subtaskJql = `project = ${projectKey} AND parent IN (${childKeys.join(',')})`;
          
          try {
            const subtaskFields = [
              'summary',
              'description',
              'status',
              'issuetype',
              'priority',
              'assignee',
              'reporter',
              'created',
              'updated',
              'parent',
              'subtasks',
              'labels',
              'components',
              'duedate',
              'resolutiondate',
              'resolution',
              'timetracking',
              'attachment',
            ];
            
            if (syncComments) {
              subtaskFields.push('comment');
            }
            
            const subtaskResponse = await this.client!.get('/search/jql', {
              params: {
                jql: subtaskJql,
                maxResults: 2000,
                fields: subtaskFields.join(','),
              },
            });
            
            const subtasks = await Promise.all(
              subtaskResponse.data.issues.map(async (issue: any) => await this.mapIssueToTicket(issue))
            );
            
            // Add unique subtasks
            subtasks.forEach((subtask: JiraTicket) => {
              if (!seenKeys.has(subtask.key)) {
                seenKeys.add(subtask.key);
                allTickets.push(subtask);
              }
            });
          } catch (error) {
            // Subtasks not found or error fetching
          }
        }
        
        return allTickets;
      }

      return allHighLevelIssues;
    } catch (error: any) {
      console.error('Failed to fetch epics and initiatives:', error);
      if (error.response?.data) {
        console.error('Jira error details:', error.response.data);
      }
      throw error;
    }
  }

  async getTicket(ticketKey: string): Promise<JiraTicket> {
    this.ensureConfigured();

    try {
      const response = await this.client!.get(`/issue/${ticketKey}`, {
        params: {
          fields: [
            'summary',
            'description',
            'status',
            'issuetype',
            'priority',
            'assignee',
            'reporter',
            'created',
            'updated',
            'parent',
            'subtasks',
            'labels',
            'components',
            'comment',
            'duedate',
            'resolutiondate',
            'resolution',
            'timetracking',
            'attachment',
            'customfield_10014', // Epic Link (common)
            'customfield_10008', // Epic Link (alternative)
            'customfield_10010', // Epic Link (alternative)
          ].join(','),
        },
      });

      return await this.mapIssueToTicket(response.data);
    } catch (error) {
      console.error(`Failed to fetch ticket ${ticketKey}:`, error);
      throw error;
    }
  }

  async createTicket(data: {
    summary: string;
    description: string;
    issueType: string;
    parentKey?: string;
    projectKey?: string;
  }): Promise<JiraTicket> {
    this.ensureConfigured();

    try {
      const payload: any = {
        fields: {
          project: {
            key: data.projectKey || this.config!.defaultProject,
          },
          summary: data.summary,
          description: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: data.description,
                  },
                ],
              },
            ],
          },
          issuetype: {
            name: data.issueType,
          },
        },
      };

      if (data.parentKey) {
        payload.fields.parent = {
          key: data.parentKey,
        };
      }

      const response = await this.client!.post('/issue', payload);
      return await this.getTicket(response.data.key);
    } catch (error) {
      console.error('Failed to create ticket:', error);
      throw error;
    }
  }

  async updateTicket(
    ticketKey: string,
    updates: {
      summary?: string;
      description?: string;
      status?: string;
      assignee?: string;
      priority?: string;
      labels?: string[];
    }
  ): Promise<void> {
    this.ensureConfigured();

    try {
      const fields: any = {};

      if (updates.summary !== undefined) {
        fields.summary = updates.summary;
      }

      if (updates.description !== undefined) {
        fields.description = {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: updates.description,
                },
              ],
            },
          ],
        };
      }

      if (updates.assignee !== undefined) {
        fields.assignee = updates.assignee ? { accountId: updates.assignee } : null;
      }

      if (updates.priority !== undefined) {
        fields.priority = updates.priority ? { name: updates.priority } : null;
      }

      if (updates.labels !== undefined) {
        fields.labels = updates.labels;
      }

      if (Object.keys(fields).length > 0) {
        await this.client!.put(`/issue/${ticketKey}`, { fields });
      }

      // Handle status transition separately
      if (updates.status) {
        await this.transitionTicket(ticketKey, updates.status);
      }
    } catch (error) {
      console.error(`Failed to update ticket ${ticketKey}:`, error);
      throw error;
    }
  }

  async transitionTicket(ticketKey: string, targetStatus: string): Promise<void> {
    this.ensureConfigured();

    try {
      // Get available transitions
      const transitionsResponse = await this.client!.get(`/issue/${ticketKey}/transitions`);
      const transitions = transitionsResponse.data.transitions;

      // Find the transition that matches the target status
      const transition = transitions.find(
        (t: any) => t.to.name.toLowerCase() === targetStatus.toLowerCase()
      );

      if (!transition) {
        throw new Error(`No transition found for status: ${targetStatus}`);
      }

      // Execute the transition
      await this.client!.post(`/issue/${ticketKey}/transitions`, {
        transition: {
          id: transition.id,
        },
      });
    } catch (error) {
      console.error(`Failed to transition ticket ${ticketKey}:`, error);
      throw error;
    }
  }

  async deleteTicket(ticketKey: string): Promise<void> {
    this.ensureConfigured();

    try {
      await this.client!.delete(`/issue/${ticketKey}`);
    } catch (error) {
      console.error(`Failed to delete ticket ${ticketKey}:`, error);
      throw error;
    }
  }

  async getComments(ticketKey: string): Promise<JiraComment[]> {
    this.ensureConfigured();

    try {
      const response = await this.client!.get(`/issue/${ticketKey}/comment`);
      return response.data.comments.map((comment: any) => ({
        id: comment.id,
        author: comment.author.displayName,
        body: this.extractTextFromADF(comment.body),
        bodyADF: comment.body, // Preserve original ADF for formatting
        created: comment.created,
        updated: comment.updated,
      }));
    } catch (error) {
      console.error(`Failed to fetch comments for ${ticketKey}:`, error);
      throw error;
    }
  }

  async addComment(ticketKey: string, body: string): Promise<void> {
    this.ensureConfigured();

    try {
      await this.client!.post(`/issue/${ticketKey}/comment`, {
        body: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: body,
                },
              ],
            },
          ],
        },
      });
    } catch (error) {
      console.error(`Failed to add comment to ${ticketKey}:`, error);
      throw error;
    }
  }

  private async mapIssueToTicket(issue: any): Promise<JiraTicket> {
    const fields = issue.fields;
    
    // Extract comments from the field if available
    const comments: JiraComment[] = [];
    if (fields.comment && fields.comment.comments) {
      for (const comment of fields.comment.comments) {
        comments.push({
          id: comment.id,
          author: comment.author?.displayName || 'Unknown',
          body: this.extractTextFromADF(comment.body),
          bodyADF: comment.body, // Preserve original ADF for formatting
          created: comment.created,
          updated: comment.updated,
        });
      }
    }
    
    // Extract time tracking information
    let timeTracking = null;
    if (fields.timetracking) {
      timeTracking = {
        originalEstimate: fields.timetracking.originalEstimate || undefined,
        remainingEstimate: fields.timetracking.remainingEstimate || undefined,
        timeSpent: fields.timetracking.timeSpent || undefined,
      };
    }
    
    // Determine parent - check both parent field and Epic Link
    // In modern Jira, epics use parent field, but some instances still use Epic Link custom field
    let parentId = fields.parent?.id || null;
    let parentKey = fields.parent?.key || null;
    
    // If no parent, check for Epic Link (common custom fields: customfield_10014, customfield_10008)
    if (!parentKey) {
      // Try common Epic Link custom field names
      for (const epicLinkField of ['customfield_10014', 'customfield_10008', 'customfield_10010']) {
        if (fields[epicLinkField]) {
          // Epic Link can be just the key (string) or an object with key
          if (typeof fields[epicLinkField] === 'string') {
            parentKey = fields[epicLinkField];
            // Note: When Epic Link is a string, we only get the key, not the ID
            // The tree building logic must handle cases where parentId is null but parentKey exists
          } else if (fields[epicLinkField]?.key) {
            parentId = fields[epicLinkField].id;
            parentKey = fields[epicLinkField].key;
          }
          break;
        }
      }
    }
    
    return {
      id: issue.id,
      key: issue.key,
      summary: fields.summary,
      description: this.extractTextFromADF(fields.description),
      descriptionADF: fields.description, // Preserve original ADF for formatting
      status: fields.status.name,
      statusCategory: fields.status.statusCategory.key,
      issueType: fields.issuetype.name,
      priority: fields.priority?.name || null,
      assignee: fields.assignee?.displayName || null,
      assigneeEmail: fields.assignee?.emailAddress || null,
      assigneeAccountId: fields.assignee?.accountId || null,
      reporter: fields.reporter?.displayName || null,
      reporterEmail: fields.reporter?.emailAddress || null,
      reporterAccountId: fields.reporter?.accountId || null,
      created: fields.created,
      updated: fields.updated,
      parentId,
      parentKey,
      subtasks: fields.subtasks?.map((st: any) => st.key) || [],
      labels: fields.labels || [],
      components: fields.components?.map((c: any) => c.name) || [],
      projectKey: fields.project?.key || this.config!.defaultProject,
      comments,
      dueDate: fields.duedate || null,
      resolutionDate: fields.resolutiondate || null,
      resolution: fields.resolution?.name || null,
      timeTracking,
      attachmentCount: fields.attachment?.length || 0,
    };
  }

  private extractTextFromADF(adf: any): string {
    if (!adf || !adf.content) return '';

    let text = '';
    const extractFromNode = (node: any): void => {
      if (node.type === 'text') {
        text += node.text;
      } else if (node.content) {
        node.content.forEach(extractFromNode);
      }
    };

    adf.content.forEach(extractFromNode);
    return text.trim();
  }
}

export const jiraService = new JiraService();

