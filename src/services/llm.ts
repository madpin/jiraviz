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
   * Generate embeddings for multiple texts in a single API call (batch operation)
   * This is more efficient than calling generateEmbedding multiple times
   */
  async generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    this.ensureConfigured();

    if (texts.length === 0) {
      return [];
    }

    try {
      // Truncate texts if too long (max 8000 chars for text-embedding-3-small)
      const truncatedTexts = texts.map(text => this.truncateForEmbedding(text));
      
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
}

export const llmService = new LLMService();

