import OpenAI from 'openai';
import { LLMConfig, JiraTicket } from '../types';

class LLMService {
  private client: OpenAI | null = null;
  private config: LLMConfig | null = null;

  configure(config: LLMConfig): void {
    this.config = config;
    
    // Use proxy in development to avoid CORS issues, direct URL in production
    const isDevelopment = import.meta.env.DEV;
    const baseURL = isDevelopment 
      ? `${window.location.origin}/api/llm`  // Use absolute URL with Vite proxy in development
      : config.baseUrl;  // Direct URL in production
    
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL,
      defaultHeaders: config.headers,
      dangerouslyAllowBrowser: true, // Required for browser usage
    });
  }

  private ensureConfigured(): void {
    if (!this.client || !this.config) {
      throw new Error('LLM service not configured');
    }
  }

  async summarizeTicket(ticket: JiraTicket, comments?: string[]): Promise<string> {
    this.ensureConfigured();

    try {
      const prompt = this.buildTicketPrompt(ticket, comments);
      
      const response = await this.client!.chat.completions.create({
        model: this.config!.model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that summarizes Jira tickets. Provide concise, clear summaries that capture the key points and current status.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_completion_tokens: 500,
      });

      return response.choices[0]?.message?.content || 'Summary unavailable';
    } catch (error) {
      console.error('Failed to generate ticket summary:', error);
      throw error;
    }
  }

  async summarizeAggregated(tickets: JiraTicket[]): Promise<string> {
    this.ensureConfigured();

    try {
      const prompt = this.buildAggregatedPrompt(tickets);
      
      const response = await this.client!.chat.completions.create({
        model: this.config!.model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that summarizes groups of Jira tickets. Provide an overview that identifies patterns, priorities, and key insights.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_completion_tokens: 800,
      });

      return response.choices[0]?.message?.content || 'Summary unavailable';
    } catch (error) {
      console.error('Failed to generate aggregated summary:', error);
      throw error;
    }
  }

  async summarizeChildren(parent: JiraTicket, children: JiraTicket[]): Promise<string> {
    this.ensureConfigured();

    try {
      const prompt = this.buildChildrenSummaryPrompt(parent, children);
      
      const response = await this.client!.chat.completions.create({
        model: this.config!.model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that summarizes child tasks under a parent ticket (Epic/Initiative). Provide a clear overview of progress, patterns, and blockers.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_completion_tokens: 600,
      });

      return response.choices[0]?.message?.content || 'Summary unavailable';
    } catch (error) {
      console.error('Failed to generate children summary:', error);
      throw error;
    }
  }

  private buildTicketPrompt(ticket: JiraTicket, comments?: string[]): string {
    let prompt = `Summarize this Jira ticket:\n\n`;
    prompt += `Key: ${ticket.key}\n`;
    prompt += `Type: ${ticket.issueType}\n`;
    prompt += `Status: ${ticket.status}\n`;
    prompt += `Priority: ${ticket.priority || 'Not set'}\n`;
    prompt += `Summary: ${ticket.summary}\n\n`;

    if (ticket.description) {
      prompt += `Description:\n${ticket.description}\n\n`;
    }

    if (comments && comments.length > 0) {
      prompt += `Recent Comments:\n`;
      comments.slice(-5).forEach((comment, i) => {
        prompt += `${i + 1}. ${comment}\n`;
      });
      prompt += '\n';
    }

    if (ticket.labels.length > 0) {
      prompt += `Labels: ${ticket.labels.join(', ')}\n`;
    }

    prompt += `\nProvide a concise summary (2-3 sentences) highlighting the main objective, current status, and any blockers or important details.`;

    return prompt;
  }

  private buildAggregatedPrompt(tickets: JiraTicket[]): string {
    let prompt = `Summarize this group of ${tickets.length} Jira tickets:\n\n`;

    tickets.forEach((ticket, i) => {
      prompt += `${i + 1}. [${ticket.key}] ${ticket.summary}\n`;
      prompt += `   Type: ${ticket.issueType}, Status: ${ticket.status}`;
      if (ticket.priority) {
        prompt += `, Priority: ${ticket.priority}`;
      }
      prompt += '\n';
    });

    prompt += `\nProvide an overview that:\n`;
    prompt += `1. Identifies common themes or patterns\n`;
    prompt += `2. Highlights the overall status distribution\n`;
    prompt += `3. Points out any high-priority items or blockers\n`;
    prompt += `4. Suggests potential areas of focus\n`;

    return prompt;
  }

  private buildChildrenSummaryPrompt(parent: JiraTicket, children: JiraTicket[]): string {
    let prompt = `Summarize the children tasks under this parent ticket:\n\n`;
    prompt += `Parent: [${parent.key}] ${parent.summary}\n`;
    prompt += `Type: ${parent.issueType}\n\n`;
    prompt += `Children (${children.length} total):\n\n`;

    children.forEach((child, i) => {
      prompt += `${i + 1}. [${child.key}] ${child.summary}\n`;
      prompt += `   Status: ${child.status}`;
      if (child.priority) {
        prompt += `, Priority: ${child.priority}`;
      }
      if (child.assignee) {
        prompt += `, Assignee: ${child.assignee}`;
      }
      prompt += '\n';
    });

    prompt += `\nProvide a concise summary (3-4 sentences) that:\n`;
    prompt += `1. Summarizes overall progress (how many done vs in progress vs todo)\n`;
    prompt += `2. Identifies any high-priority items or blockers\n`;
    prompt += `3. Highlights common themes or patterns across children\n`;
    prompt += `4. Notes any items that need attention\n`;

    return prompt;
  }

  /**
   * Truncate text to max 8000 chars for text-embedding-3-small model
   * If text is longer, take first 4000 and last 4000 chars
   */
  private truncateForEmbedding(text: string): string {
    if (text.length <= 8000) {
      return text;
    }
    const first4000 = text.substring(0, 4000);
    const last4000 = text.substring(text.length - 4000);
    return first4000 + last4000;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    this.ensureConfigured();

    try {
      // Truncate text if too long (max 8000 chars for text-embedding-3-small)
      const truncatedText = this.truncateForEmbedding(text);
      
      const response = await this.client!.embeddings.create({
        model: 'text-embedding-3-small', // Using OpenAI's embedding model
        input: truncatedText,
      });

      return response.data[0].embedding;
    } catch (error: any) {
      console.error('Failed to generate embedding:', error);
      // Provide more specific error message
      if (error?.status === 401) {
        throw new Error('LLM API authentication failed. Please check your API key in settings.');
      } else if (error?.status === 429) {
        throw new Error('LLM API rate limit exceeded. Please try again later.');
      } else if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
        throw new Error('Network error when connecting to LLM API. Please check your connection.');
      }
      throw new Error(`Failed to generate embedding: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Estimate token count for text (rough approximation: 1 token ≈ 4 characters)
   */
  private estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Generate embeddings for multiple texts in a single API call (batch operation)
   * This is more efficient than calling generateEmbedding multiple times
   * Automatically splits into smaller batches if token limit would be exceeded
   */
  async generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    this.ensureConfigured();

    if (texts.length === 0) {
      return [];
    }

    // Truncate texts if too long (max 8000 chars for text-embedding-3-small)
    const truncatedTexts = texts.map(text => this.truncateForEmbedding(text));
    
    // Calculate total estimated tokens
    const totalTokens = truncatedTexts.reduce((sum, text) => sum + this.estimateTokenCount(text), 0);
    const TOKEN_LIMIT = 8000; // Leave some buffer from the 8191 limit
    
    // If total tokens exceed limit, split into smaller batches recursively
    if (totalTokens > TOKEN_LIMIT) {
      // Split roughly in half
      const mid = Math.floor(texts.length / 2);
      const firstHalf = texts.slice(0, mid);
      const secondHalf = texts.slice(mid);
      
      // Process both halves
      const [firstResults, secondResults] = await Promise.all([
        this.generateEmbeddingsBatch(firstHalf),
        this.generateEmbeddingsBatch(secondHalf),
      ]);
      
      return [...firstResults, ...secondResults];
    }

    try {
      const response = await this.client!.embeddings.create({
        model: 'text-embedding-3-small',
        input: truncatedTexts,
      });

      // Return embeddings in the same order as input texts
      return response.data
        .sort((a, b) => a.index - b.index)
        .map(item => item.embedding);
    } catch (error: any) {
      console.error('Failed to generate batch embeddings:', error);
      // Provide more specific error message
      if (error?.status === 401) {
        throw new Error('LLM API authentication failed. Please check your API key in settings.');
      } else if (error?.status === 429) {
        throw new Error('LLM API rate limit exceeded. Please try again later.');
      } else if (error?.status === 400 && error?.message?.includes('maximum context length')) {
        // If we still hit token limit despite our estimation, fall back to individual processing
        console.warn('Token limit exceeded despite estimation. Falling back to individual processing...');
        throw new Error(`Token limit exceeded: ${error?.message}`);
      } else if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
        throw new Error('Network error when connecting to LLM API. Please check your connection.');
      }
      throw new Error(`Failed to generate batch embeddings: ${error?.message || 'Unknown error'}`);
    }
  }

  getTicketText(ticket: JiraTicket): string {
    // Create a text representation of the ticket for embedding
    let text = `${ticket.key}: ${ticket.summary}`;
    if (ticket.description) {
      text += `\n${ticket.description}`;
    }
    if (ticket.labels.length > 0) {
      text += `\nLabels: ${ticket.labels.join(', ')}`;
    }
    return text;
  }

  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // ============================================================================
  // TICKET WIZARD METHODS
  // ============================================================================

  /**
   * Find relevant epics for a project description using LLM
   */
  async findRelevantEpics(
    projectDescription: string,
    epics: JiraTicket[]
  ): Promise<Array<{ epic: JiraTicket; score: number }>> {
    this.ensureConfigured();

    try {
      // Create a prompt for epic matching
      const epicsText = epics
        .map(
          (epic, i) =>
            `Epic ${i + 1}: ${epic.key} - ${epic.summary}\nDescription: ${(epic.description || '').substring(0, 200)}`
        )
        .join('\n\n');

      const prompt = `You are helping match a project description to relevant Jira EPICs.

Project description: ${projectDescription}

Available EPICs:
${epicsText}

For each EPIC, rate its relevance to the project description on a scale of 0.0 to 1.0, where:
- 1.0 = Perfect match, highly relevant
- 0.7-0.9 = Strong relevance
- 0.4-0.6 = Moderate relevance
- 0.1-0.3 = Weak relevance
- 0.0 = Not relevant

Respond with a JSON array of objects with 'epic_number' (1-based) and 'relevance_score':
[{"epic_number": 1, "relevance_score": 0.8}, ...]

Only include EPICs with relevance_score >= 0.3.`;

      const response = await this.client!.chat.completions.create({
        model: this.config!.model,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.choices[0]?.message?.content?.trim() || '';

      // Try to extract JSON from markdown code blocks if present
      let jsonContent = content;
      if (content.startsWith('```')) {
        const lines = content.split('\n');
        const jsonLines: string[] = [];
        let inCodeBlock = false;
        for (const line of lines) {
          if (line.startsWith('```')) {
            inCodeBlock = !inCodeBlock;
            continue;
          }
          if (inCodeBlock) {
            jsonLines.push(line);
          }
        }
        jsonContent = jsonLines.join('\n').trim();
      }

      if (!jsonContent) {
        return [];
      }

      const scores = JSON.parse(jsonContent);

      // Match scores to epics
      const relevantEpics: Array<{ epic: JiraTicket; score: number }> = [];
      for (const scoreObj of scores) {
        const epicIdx = scoreObj.epic_number - 1;
        if (epicIdx >= 0 && epicIdx < epics.length) {
          relevantEpics.push({
            epic: epics[epicIdx],
            score: scoreObj.relevance_score,
          });
        }
      }

      // Sort by relevance score (highest first)
      relevantEpics.sort((a, b) => b.score - a.score);

      return relevantEpics;
    } catch (error) {
      console.error('Error finding relevant epics:', error);
      return [];
    }
  }

  /**
   * Generate epic title and description using LLM
   */
  async generateEpic(
    projectDescription: string,
    aspect: string
  ): Promise<{ title: string; description: string }> {
    this.ensureConfigured();

    const prompt = `You are a Jira expert helping create an EPIC.

Project description: ${projectDescription}

Aspect/Type: ${aspect}

Create a comprehensive EPIC with:
1. A clear, concise title that captures the epic's scope
2. A detailed description including:
   - Background and context
   - Goals and objectives
   - Scope (what's included and what's not)
   - Success criteria
   - Any relevant technical considerations

Respond with a JSON object:
{
    "title": "Epic title here",
    "description": "Detailed epic description here"
}`;

    const response = await this.client!.chat.completions.create({
      model: this.config!.model,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.choices[0]?.message?.content?.trim() || '';

    // Try to extract JSON from markdown code blocks if present
    let jsonContent = content;
    if (content.startsWith('```')) {
      const lines = content.split('\n');
      const jsonLines: string[] = [];
      let inCodeBlock = false;
      for (const line of lines) {
        if (line.startsWith('```')) {
          inCodeBlock = !inCodeBlock;
          continue;
        }
        if (inCodeBlock) {
          jsonLines.push(line);
        }
      }
      jsonContent = jsonLines.join('\n').trim();
    }

    const result = JSON.parse(jsonContent);
    return { title: result.title, description: result.description };
  }

  /**
   * Enhance ticket description using LLM with template and context
   */
  async enhanceTicket(
    userInput: string,
    templatePrompt: string,
    kbContext: string = '',
    gleanContext: string = ''
  ): Promise<{ summary: string; description: string }> {
    this.ensureConfigured();

    // Format the prompt with context
    const prompt = templatePrompt
      .replace('{user_input}', userInput)
      .replace('{kb_context}', kbContext || 'No additional context available.')
      .replace('{glean_context}', gleanContext || 'No documentation found.');

    const response = await this.client!.chat.completions.create({
      model: this.config!.model,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.choices[0]?.message?.content?.trim() || '';

    // Try to extract JSON from markdown code blocks if present
    let jsonContent = content;
    if (content.startsWith('```')) {
      const lines = content.split('\n');
      const jsonLines: string[] = [];
      let inCodeBlock = false;
      for (const line of lines) {
        if (line.startsWith('```')) {
          inCodeBlock = !inCodeBlock;
          continue;
        }
        if (inCodeBlock) {
          jsonLines.push(line);
        }
      }
      jsonContent = jsonLines.join('\n').trim();
    }

    const result = JSON.parse(jsonContent);
    return { summary: result.summary, description: result.description };
  }

  /**
   * Plan ticket splits - break work into multiple tickets
   */
  async planTicketSplits(
    projectDescription: string,
    taskDescription: string,
    maxTickets: number = 6
  ): Promise<
    Array<{
      title: string;
      summary: string;
      issueType: string;
      priority: string;
      rationale: string;
    }>
  > {
    this.ensureConfigured();

    if (!taskDescription.trim()) {
      return [];
    }

    const prompt = `You are a senior engineering manager helping plan Jira tickets.

Project description:
${projectDescription}

Task the team wants to tackle:
${taskDescription}

Plan concrete Jira tickets that can be completed independently. Between 1 and ${maxTickets} tickets is ideal.

Return a JSON array. Each entry must include:
{
  "title": "Ticket nickname for overview",
  "summary": "Suggested Jira summary/title",
  "issueType": "Story | Task | Bug | Spike | KTLO...",
  "priority": "High | Medium | Low",
  "rationale": "Why this ticket is needed / scope notes"
}

Focus on actionable tickets with clear boundaries.`;

    const response = await this.client!.chat.completions.create({
      model: this.config!.model,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.choices[0]?.message?.content?.trim() || '';

    // Try to extract JSON from markdown code blocks if present
    let jsonContent = content;
    if (content.startsWith('```')) {
      const lines = content.split('\n');
      const jsonLines: string[] = [];
      let inCodeBlock = false;
      for (const line of lines) {
        if (line.startsWith('```')) {
          inCodeBlock = !inCodeBlock;
          continue;
        }
        if (inCodeBlock) {
          jsonLines.push(line);
        }
      }
      jsonContent = jsonLines.join('\n').trim();
    }

    if (!jsonContent) {
      return [];
    }

    const plan = JSON.parse(jsonContent);
    if (!Array.isArray(plan)) {
      return [];
    }

    return plan.slice(0, maxTickets);
  }

  /**
   * Generate full ticket from outline plan
   */
  async generateTicketFromOutline(
    projectDescription: string,
    outline: {
      title?: string;
      summary: string;
      issueType: string;
      priority: string;
      rationale: string;
    },
    kbContext: string = '',
    gleanContext: string = ''
  ): Promise<{ summary: string; description: string; issueType: string }> {
    this.ensureConfigured();

    const outlineJson = JSON.stringify(outline, null, 2);
    const prompt = `You are a Jira ticket expert.

Project description:
${projectDescription}

Ticket outline:
${outlineJson}

Knowledge base context:
${kbContext || 'No additional context provided.'}

Glean documentation:
${gleanContext || 'No documentation found.'}

Write a polished ticket.

Return JSON with:
{
  "summary": "Jira summary",
  "description": "Detailed description with context + acceptance criteria",
  "issueType": "Use outline issueType if provided, otherwise choose best fit"
}`;

    const response = await this.client!.chat.completions.create({
      model: this.config!.model,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.choices[0]?.message?.content?.trim() || '';

    // Try to extract JSON from markdown code blocks if present
    let jsonContent = content;
    if (content.startsWith('```')) {
      const lines = content.split('\n');
      const jsonLines: string[] = [];
      let inCodeBlock = false;
      for (const line of lines) {
        if (line.startsWith('```')) {
          inCodeBlock = !inCodeBlock;
          continue;
        }
        if (inCodeBlock) {
          jsonLines.push(line);
        }
      }
      jsonContent = jsonLines.join('\n').trim();
    }

    if (!jsonContent) {
      throw new Error('LLM returned an empty response for ticket draft.');
    }

    const result = JSON.parse(jsonContent);
    const issueType = result.issueType || outline.issueType || 'Task';

    return {
      summary: result.summary,
      description: result.description,
      issueType,
    };
  }
}

export const llmService = new LLMService();

