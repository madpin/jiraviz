import { JiraTicket, TicketSummary, ParentSummaryCache } from '../types';

const DB_KEY = 'jiraviz_db';
const DB_VERSION = 5; // Increment when schema changes (added parent_summaries table)
const VERSION_KEY = 'jiraviz_db_version';

// Load SQL.js from CDN
const loadSqlJs = async (): Promise<any> => {
  // Check if already loaded
  if ((window as any).initSqlJs) {
    return (window as any).initSqlJs;
  }

  // Load the script
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://sql.js.org/dist/sql-wasm.js';
    script.onload = () => {
      if ((window as any).initSqlJs) {
        resolve((window as any).initSqlJs);
      } else {
        reject(new Error('Failed to load SQL.js'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load SQL.js script'));
    document.head.appendChild(script);
  });
};

class DatabaseService {
  private db: any = null;
  private SQL: any = null;

  async initialize(): Promise<void> {
    try {
      // Load and initialize SQL.js from CDN
      const initSqlJs = await loadSqlJs();
      this.SQL = await initSqlJs({
        locateFile: (file: string) => `https://sql.js.org/dist/${file}`,
      });

      // Try to load existing database from localStorage
      const savedDb = localStorage.getItem(DB_KEY);
      const currentVersion = parseInt(localStorage.getItem(VERSION_KEY) || '0');
      
      if (savedDb && currentVersion === DB_VERSION) {
        // Load existing database with correct version
        const buffer = this.base64ToBuffer(savedDb);
        this.db = new this.SQL.Database(buffer);
      } else if (savedDb && currentVersion < DB_VERSION) {
        // Need to migrate old database
        console.log(`Migrating database from version ${currentVersion} to ${DB_VERSION}`);
        const buffer = this.base64ToBuffer(savedDb);
        this.db = new this.SQL.Database(buffer);
        await this.migrateDatabase(currentVersion);
        localStorage.setItem(VERSION_KEY, DB_VERSION.toString());
      } else {
        // Create new database
        console.log('Creating new database');
        this.db = new this.SQL.Database();
        await this.createTables();
        localStorage.setItem(VERSION_KEY, DB_VERSION.toString());
      }
    } catch (error) {
      console.error('Failed to initialize database:', error);
      // If there's an error loading the old database, create a new one
      console.log('Creating fresh database due to error');
      localStorage.removeItem(DB_KEY);
      localStorage.removeItem(VERSION_KEY);
      this.db = new this.SQL.Database();
      await this.createTables();
      localStorage.setItem(VERSION_KEY, DB_VERSION.toString());
    }
  }

  private async migrateDatabase(fromVersion: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    console.log(`Running migrations from version ${fromVersion}`);

    // Migration from version 1 to 2: Add user identification fields
    if (fromVersion < 2) {
      try {
        console.log('Migration 1->2: Adding user identification fields');
        
        // Add new columns for assignee/reporter identification
        this.db.run('ALTER TABLE tickets ADD COLUMN assigneeEmail TEXT');
        this.db.run('ALTER TABLE tickets ADD COLUMN assigneeAccountId TEXT');
        this.db.run('ALTER TABLE tickets ADD COLUMN reporterEmail TEXT');
        this.db.run('ALTER TABLE tickets ADD COLUMN reporterAccountId TEXT');
        
        console.log('Migration 1->2: Complete');
      } catch (error) {
        console.error('Migration 1->2 failed:', error);
        // If migration fails, it might be because columns already exist
        // This is okay - we'll continue
      }
    }

    // Migration from version 2 to 3: Add comments and other missing fields
    if (fromVersion < 3) {
      try {
        console.log('Migration 2->3: Adding comments and extended fields');
        
        // Check if comments column exists, if not add it
        const tableInfo = this.db.exec('PRAGMA table_info(tickets)');
        const columns = tableInfo[0]?.values.map((row: any) => row[1]) || [];
        
        if (!columns.includes('comments')) {
          this.db.run('ALTER TABLE tickets ADD COLUMN comments TEXT');
          console.log('  - Added comments column');
        }
        
        if (!columns.includes('dueDate')) {
          this.db.run('ALTER TABLE tickets ADD COLUMN dueDate TEXT');
          console.log('  - Added dueDate column');
        }
        
        if (!columns.includes('resolutionDate')) {
          this.db.run('ALTER TABLE tickets ADD COLUMN resolutionDate TEXT');
          console.log('  - Added resolutionDate column');
        }
        
        if (!columns.includes('resolution')) {
          this.db.run('ALTER TABLE tickets ADD COLUMN resolution TEXT');
          console.log('  - Added resolution column');
        }
        
        if (!columns.includes('timeTracking')) {
          this.db.run('ALTER TABLE tickets ADD COLUMN timeTracking TEXT');
          console.log('  - Added timeTracking column');
        }
        
        if (!columns.includes('attachmentCount')) {
          this.db.run('ALTER TABLE tickets ADD COLUMN attachmentCount INTEGER DEFAULT 0');
          console.log('  - Added attachmentCount column');
        }
        
        console.log('Migration 2->3: Complete');
      } catch (error) {
        console.error('Migration 2->3 failed:', error);
        // If migration fails, it might be because columns already exist
        // This is okay - we'll continue
      }
    }

    // Migration from version 3 to 4: Add embedding field for persistent storage
    if (fromVersion < 4) {
      try {
        console.log('Migration 3->4: Adding embedding field for AI similarity features');
        
        // Check if embedding column exists, if not add it
        const tableInfo = this.db.exec('PRAGMA table_info(tickets)');
        const columns = tableInfo[0]?.values.map((row: any) => row[1]) || [];
        
        if (!columns.includes('embedding')) {
          this.db.run('ALTER TABLE tickets ADD COLUMN embedding TEXT');
          console.log('  - Added embedding column (stores vector embeddings as JSON)');
        }
        
        console.log('Migration 3->4: Complete');
        console.log('Note: Embeddings will be generated on-demand for Smart Order sorting');
      } catch (error) {
        console.error('Migration 3->4 failed:', error);
        // If migration fails, it might be because column already exists
        // This is okay - we'll continue
      }
    }

    // Migration from version 4 to 5: Add parent_summaries table
    if (fromVersion < 5) {
      try {
        console.log('Migration 4->5: Adding parent_summaries table');
        
        this.db.run(`
          CREATE TABLE IF NOT EXISTS parent_summaries (
            parent_id TEXT PRIMARY KEY,
            summary TEXT NOT NULL,
            children_ids TEXT NOT NULL,
            created_at TEXT NOT NULL
          )
        `);
        
        console.log('Migration 4->5: Complete');
      } catch (error) {
        console.error('Migration 4->5 failed:', error);
      }
    }

    this.save();
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Tickets table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS tickets (
        id TEXT PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        summary TEXT NOT NULL,
        description TEXT,
        descriptionADF TEXT,
        status TEXT NOT NULL,
        statusCategory TEXT NOT NULL,
        issueType TEXT NOT NULL,
        priority TEXT,
        assignee TEXT,
        assigneeEmail TEXT,
        assigneeAccountId TEXT,
        reporter TEXT,
        reporterEmail TEXT,
        reporterAccountId TEXT,
        created TEXT NOT NULL,
        updated TEXT NOT NULL,
        parentId TEXT,
        parentKey TEXT,
        subtasks TEXT,
        labels TEXT,
        components TEXT,
        projectKey TEXT NOT NULL,
        comments TEXT,
        dueDate TEXT,
        resolutionDate TEXT,
        resolution TEXT,
        timeTracking TEXT,
        attachmentCount INTEGER DEFAULT 0,
        embedding TEXT
      )
    `);

    // Add descriptionADF column if it doesn't exist (for existing databases)
    try {
      this.db.run('ALTER TABLE tickets ADD COLUMN descriptionADF TEXT');
    } catch (e) {
      // Column might already exist, ignore error
    }

    // Summaries table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS summaries (
        id TEXT PRIMARY KEY,
        ticketId TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (ticketId) REFERENCES tickets(id)
      )
    `);

    // Config table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    // Parent summaries table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS parent_summaries (
        parent_id TEXT PRIMARY KEY,
        summary TEXT NOT NULL,
        children_ids TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);

    this.save();
  }

  private save(): void {
    if (!this.db) return;
    try {
      const data = this.db.export();
      const base64 = this.bufferToBase64(data);
      localStorage.setItem(DB_KEY, base64);
    } catch (error: any) {
      if (error.name === 'QuotaExceededError') {
        console.warn('⚠️ localStorage quota exceeded. Attempting to free space by removing embeddings...');
        this.clearEmbeddings();
        // Try saving again without embeddings
        try {
          const data = this.db.export();
          const base64 = this.bufferToBase64(data);
          localStorage.setItem(DB_KEY, base64);
          console.log('✅ Database saved successfully after clearing embeddings');
        } catch (retryError) {
          console.error('❌ Failed to save database even after clearing embeddings:', retryError);
          throw retryError;
        }
      } else {
        throw error;
      }
    }
  }

  private bufferToBase64(buffer: Uint8Array): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const len = binary.length;
    const buffer = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      buffer[i] = binary.charCodeAt(i);
    }
    return buffer;
  }

  // Ticket CRUD operations
  async saveTickets(tickets: JiraTicket[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Get existing tickets to preserve embeddings if content hasn't changed
    const existingTickets = await this.getTickets();
    const existingMap = new Map(existingTickets.map(t => [t.id, t]));

    // Clear existing tickets (for full sync)
    this.db.run('DELETE FROM tickets');

    // Use INSERT OR REPLACE to handle duplicates
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO tickets (
        id, key, summary, description, descriptionADF, status, statusCategory, issueType,
        priority, assignee, assigneeEmail, assigneeAccountId, reporter, reporterEmail, reporterAccountId,
        created, updated, parentId, parentKey,
        subtasks, labels, components, projectKey, comments, dueDate, 
        resolutionDate, resolution, timeTracking, attachmentCount, embedding
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const ticket of tickets) {
      // Preserve existing embedding if summary/description hasn't changed
      const existing = existingMap.get(ticket.id);
      let embedding = ticket.embedding;
      
      if (!embedding && existing?.embedding) {
        // Content that affects embedding: summary, description
        const contentChanged = 
          existing.summary !== ticket.summary ||
          existing.description !== ticket.description;
        
        if (!contentChanged) {
          // Preserve the existing embedding
          embedding = existing.embedding;
        }
      }

      stmt.run([
        ticket.id,
        ticket.key,
        ticket.summary,
        ticket.description,
        ticket.descriptionADF ? JSON.stringify(ticket.descriptionADF) : null,
        ticket.status,
        ticket.statusCategory,
        ticket.issueType,
        ticket.priority,
        ticket.assignee,
        ticket.assigneeEmail,
        ticket.assigneeAccountId,
        ticket.reporter,
        ticket.reporterEmail,
        ticket.reporterAccountId,
        ticket.created,
        ticket.updated,
        ticket.parentId,
        ticket.parentKey,
        JSON.stringify(ticket.subtasks),
        JSON.stringify(ticket.labels),
        JSON.stringify(ticket.components),
        ticket.projectKey,
        JSON.stringify(ticket.comments || []),
        ticket.dueDate,
        ticket.resolutionDate,
        ticket.resolution,
        JSON.stringify(ticket.timeTracking),
        ticket.attachmentCount || 0,
        embedding ? JSON.stringify(embedding) : null,
      ]);
    }

    stmt.free();
    this.save();
  }

  async getTickets(): Promise<JiraTicket[]> {
    if (!this.db) throw new Error('Database not initialized');

    const result = this.db.exec(`
      SELECT id, key, summary, description, descriptionADF, status, statusCategory, issueType,
             priority, assignee, assigneeEmail, assigneeAccountId, reporter, reporterEmail, reporterAccountId,
             created, updated, parentId, parentKey, subtasks, labels, components, projectKey,
             comments, dueDate, resolutionDate, resolution, timeTracking, attachmentCount, embedding
      FROM tickets ORDER BY created DESC
    `);
    if (result.length === 0) return [];

    const tickets: JiraTicket[] = [];
    const rows = result[0];

    for (let i = 0; i < rows.values.length; i++) {
      const row = rows.values[i];
      
      // Safely parse descriptionADF - it might be null or undefined in migrated databases
      let descriptionADF = null;
      try {
        if (row[4]) {
          descriptionADF = JSON.parse(row[4] as string);
        }
      } catch (e) {
        // If parsing fails, leave as null (likely from old database)
        console.warn('Failed to parse descriptionADF for ticket:', row[0], e);
      }
      
      tickets.push({
        id: row[0] as string,
        key: row[1] as string,
        summary: row[2] as string,
        description: row[3] as string | null,
        descriptionADF,
        status: row[5] as string,
        statusCategory: row[6] as string,
        issueType: row[7] as string,
        priority: row[8] as string | null,
        assignee: row[9] as string | null,
        assigneeEmail: row[10] as string | null,
        assigneeAccountId: row[11] as string | null,
        reporter: row[12] as string | null,
        reporterEmail: row[13] as string | null,
        reporterAccountId: row[14] as string | null,
        created: row[15] as string,
        updated: row[16] as string,
        parentId: row[17] as string | null,
        parentKey: row[18] as string | null,
        subtasks: JSON.parse(row[19] as string),
        labels: JSON.parse(row[20] as string),
        components: JSON.parse(row[21] as string),
        projectKey: row[22] as string,
        comments: row[23] ? JSON.parse(row[23] as string) : [],
        dueDate: row[24] as string | null,
        resolutionDate: row[25] as string | null,
        resolution: row[26] as string | null,
        timeTracking: row[27] ? JSON.parse(row[27] as string) : null,
        attachmentCount: (row[28] as number) || 0,
        embedding: row[29] ? JSON.parse(row[29] as string) : null,
      });
    }

    return tickets;
  }

  async getTicketById(id: string): Promise<JiraTicket | null> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      SELECT id, key, summary, description, descriptionADF, status, statusCategory, issueType,
             priority, assignee, assigneeEmail, assigneeAccountId, reporter, reporterEmail, reporterAccountId,
             created, updated, parentId, parentKey, subtasks, labels, components, projectKey,
             comments, dueDate, resolutionDate, resolution, timeTracking, attachmentCount, embedding
      FROM tickets WHERE id = ?
    `);
    stmt.bind([id]);

    if (!stmt.step()) {
      stmt.free();
      return null;
    }

    const row = stmt.get();
    stmt.free();

    // Safely parse descriptionADF - it might be null or undefined in migrated databases
    let descriptionADF = null;
    try {
      if (row[4]) {
        descriptionADF = JSON.parse(row[4] as string);
      }
    } catch (e) {
      // If parsing fails, leave as null (likely from old database)
      console.warn('Failed to parse descriptionADF for ticket:', row[0], e);
    }

    return {
      id: row[0] as string,
      key: row[1] as string,
      summary: row[2] as string,
      description: row[3] as string | null,
      descriptionADF,
      status: row[5] as string,
      statusCategory: row[6] as string,
      issueType: row[7] as string,
      priority: row[8] as string | null,
      assignee: row[9] as string | null,
      assigneeEmail: row[10] as string | null,
      assigneeAccountId: row[11] as string | null,
      reporter: row[12] as string | null,
      reporterEmail: row[13] as string | null,
      reporterAccountId: row[14] as string | null,
      created: row[15] as string,
      updated: row[16] as string,
      parentId: row[17] as string | null,
      parentKey: row[18] as string | null,
      subtasks: JSON.parse(row[19] as string),
      labels: JSON.parse(row[20] as string),
      components: JSON.parse(row[21] as string),
      projectKey: row[22] as string,
      comments: row[23] ? JSON.parse(row[23] as string) : [],
      dueDate: row[24] as string | null,
      resolutionDate: row[25] as string | null,
      resolution: row[26] as string | null,
      timeTracking: row[27] ? JSON.parse(row[27] as string) : null,
      attachmentCount: (row[28] as number) || 0,
      embedding: row[29] ? JSON.parse(row[29] as string) : null,
    };
  }

  async updateTicket(ticket: JiraTicket): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Check if content changed (summary or description)
    const existingTicket = await this.getTicketById(ticket.id);
    let embedding = ticket.embedding;
    
    if (existingTicket) {
      const contentChanged = 
        existingTicket.summary !== ticket.summary ||
        existingTicket.description !== ticket.description;
      
      if (contentChanged) {
        // Content changed, invalidate embedding
        embedding = null;
      } else if (!embedding && existingTicket.embedding) {
        // Content didn't change, preserve existing embedding
        embedding = existingTicket.embedding;
      }
    }

    const stmt = this.db.prepare(`
      UPDATE tickets SET
        summary = ?, description = ?, descriptionADF = ?, status = ?, statusCategory = ?,
        priority = ?, assignee = ?, updated = ?,
        labels = ?, components = ?, comments = ?, dueDate = ?,
        resolutionDate = ?, resolution = ?, timeTracking = ?, attachmentCount = ?,
        embedding = ?
      WHERE id = ?
    `);

    stmt.run([
      ticket.summary,
      ticket.description,
      ticket.descriptionADF ? JSON.stringify(ticket.descriptionADF) : null,
      ticket.status,
      ticket.statusCategory,
      ticket.priority,
      ticket.assignee,
      ticket.updated,
      JSON.stringify(ticket.labels),
      JSON.stringify(ticket.components),
      JSON.stringify(ticket.comments || []),
      ticket.dueDate,
      ticket.resolutionDate,
      ticket.resolution,
      JSON.stringify(ticket.timeTracking),
      ticket.attachmentCount || 0,
      embedding ? JSON.stringify(embedding) : null,
      ticket.id,
    ]);

    stmt.free();
    this.save();
  }

  // Summary CRUD operations
  async saveSummary(summary: TicketSummary): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO summaries (id, ticketId, type, content, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run([
      summary.id,
      summary.ticketId,
      summary.type,
      summary.content,
      summary.createdAt,
    ]);

    stmt.free();
    this.save();
  }

  async getSummary(ticketId: string, type: 'individual' | 'aggregated'): Promise<TicketSummary | null> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(
      'SELECT * FROM summaries WHERE ticketId = ? AND type = ? ORDER BY createdAt DESC LIMIT 1'
    );
    stmt.bind([ticketId, type]);

    if (!stmt.step()) {
      stmt.free();
      return null;
    }

    const row = stmt.get();
    stmt.free();

    return {
      id: row[0] as string,
      ticketId: row[1] as string,
      type: row[2] as 'individual' | 'aggregated',
      content: row[3] as string,
      createdAt: row[4] as string,
    };
  }

  // Config operations
  async setConfig(key: string, value: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)');
    stmt.run([key, value]);
    stmt.free();
    this.save();
  }

  async getConfig(key: string): Promise<string | null> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('SELECT value FROM config WHERE key = ?');
    stmt.bind([key]);

    if (!stmt.step()) {
      stmt.free();
      return null;
    }

    const value = stmt.get()[0] as string;
    stmt.free();
    return value;
  }

  async clearDatabase(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    this.db.run('DELETE FROM tickets');
    this.db.run('DELETE FROM summaries');
    this.db.run('DELETE FROM parent_summaries');
    this.save();
  }

  /**
   * Clear all embeddings from the database to free up space
   * Embeddings will be regenerated on demand when needed
   */
  clearEmbeddings(): void {
    if (!this.db) return;
    
    try {
      this.db.run('UPDATE tickets SET embedding = NULL');
      console.log('✅ Cleared all embeddings from database');
      console.log('ℹ️  Embeddings will be kept in memory and regenerated as needed. Your ticket data is safe!');
      console.log('ℹ️  See STORAGE_OPTIMIZATION.md for details about storage management.');
    } catch (error) {
      console.error('Failed to clear embeddings:', error);
    }
  }

  /**
   * Get storage usage information
   */
  getStorageInfo(): { used: number; total: number; percentage: number } {
    try {
      const dbData = localStorage.getItem(DB_KEY);
      const used = dbData ? dbData.length : 0;
      
      // Estimate total available (typically 5-10MB, we'll use 5MB as conservative)
      const total = 5 * 1024 * 1024; // 5MB in bytes
      const percentage = (used / total) * 100;
      
      return { used, total, percentage };
    } catch (error) {
      return { used: 0, total: 5 * 1024 * 1024, percentage: 0 };
    }
  }

  /**
   * Check if we're approaching storage limits
   */
  isStorageNearLimit(): boolean {
    const info = this.getStorageInfo();
    return info.percentage > 80; // Warn if over 80%
  }

  // Embedding operations
  async saveTicketEmbedding(ticketId: string, embedding: number[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Skip saving if storage is near limit
    if (this.isStorageNearLimit()) {
      console.warn('⚠️ Storage near limit - not persisting embeddings. They will be kept in memory for this session.');
      return;
    }

    try {
      const stmt = this.db.prepare('UPDATE tickets SET embedding = ? WHERE id = ?');
      stmt.run([JSON.stringify(embedding), ticketId]);
      stmt.free();
      this.save();
    } catch (error: any) {
      if (error.name === 'QuotaExceededError') {
        // Don't save embeddings if quota is exceeded
        console.warn(`⚠️ localStorage quota exceeded. Clearing embeddings to free space...`);
        this.clearEmbeddings();
        // Embeddings will remain in memory cache and work for this session
      } else {
        throw error;
      }
    }
  }

  async getTicketEmbedding(ticketId: string): Promise<number[] | null> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('SELECT embedding FROM tickets WHERE id = ?');
    stmt.bind([ticketId]);

    if (!stmt.step()) {
      stmt.free();
      return null;
    }

    const embedding = stmt.get()[0];
    stmt.free();

    return embedding ? JSON.parse(embedding as string) : null;
  }

  // Parent summary cache operations
  async getParentSummary(parentId: string): Promise<ParentSummaryCache | null> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(
      'SELECT parent_id, summary, children_ids, created_at FROM parent_summaries WHERE parent_id = ?'
    );
    stmt.bind([parentId]);

    if (!stmt.step()) {
      stmt.free();
      return null;
    }

    const row = stmt.get();
    stmt.free();

    return {
      parentId: row[0] as string,
      summary: row[1] as string,
      childrenIds: JSON.parse(row[2] as string),
      createdAt: row[3] as string,
    };
  }

  async saveParentSummary(cache: ParentSummaryCache): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(
      'INSERT OR REPLACE INTO parent_summaries (parent_id, summary, children_ids, created_at) VALUES (?, ?, ?, ?)'
    );
    stmt.run([
      cache.parentId,
      cache.summary,
      JSON.stringify(cache.childrenIds),
      cache.createdAt,
    ]);
    stmt.free();
    this.save();
  }

  async deleteParentSummary(parentId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('DELETE FROM parent_summaries WHERE parent_id = ?');
    stmt.run([parentId]);
    stmt.free();
    this.save();
  }
}

// Singleton instance
export const db = new DatabaseService();

