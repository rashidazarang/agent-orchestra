/**
 * MCP Gateway
 * 
 * Manages connections to multiple MCP servers including
 * Airtable, Supabase, and other data sources
 */

import { EventEmitter } from 'events';
import { MCPServer, MCPServerConfig, MCPTool, MCPResponse } from '../types';
import { Logger } from '../utils/logger';

export class MCPGateway extends EventEmitter {
  private servers: Map<string, MCPServer> = new Map();
  private logger: Logger;
  private config: any;

  constructor(config: any) {
    super();
    this.config = config;
    this.logger = new Logger('MCPGateway');
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing MCP Gateway...');
    
    // Load default servers
    await this.loadDefaultServers();
    
    // Load custom servers from config
    if (this.config.servers) {
      for (const serverConfig of this.config.servers) {
        await this.addServer(serverConfig);
      }
    }
    
    this.logger.info(`MCP Gateway initialized with ${this.servers.size} servers`);
  }

  /**
   * Load default MCP servers (Airtable, Supabase, etc.)
   */
  private async loadDefaultServers(): Promise<void> {
    const defaultServers: MCPServerConfig[] = [
      {
        name: 'airtable',
        package: '@rashidazarang/airtable-mcp',
        version: '3.2.4',
        config: {
          token: process.env.AIRTABLE_TOKEN,
          baseId: process.env.AIRTABLE_BASE_ID
        }
      },
      {
        name: 'supabase',
        package: '@supabase/mcp-server',
        version: '1.0.0',
        config: {
          url: process.env.SUPABASE_URL,
          key: process.env.SUPABASE_KEY
        }
      }
    ];

    for (const serverConfig of defaultServers) {
      if (this.hasRequiredEnvVars(serverConfig)) {
        await this.addServer(serverConfig);
      } else {
        this.logger.warn(`Skipping ${serverConfig.name} - missing environment variables`);
      }
    }
  }

  /**
   * Add a new MCP server
   */
  async addServer(config: MCPServerConfig): Promise<void> {
    try {
      this.logger.info(`Adding MCP server: ${config.name}`);
      
      const server: MCPServer = {
        id: `mcp-${config.name}`,
        name: config.name,
        package: config.package,
        version: config.version,
        status: 'initializing',
        config: config.config,
        tools: [],
        connection: null
      };

      // Initialize server connection
      await this.connectServer(server);
      
      // Discover available tools
      await this.discoverTools(server);
      
      this.servers.set(server.id, server);
      this.emit('server:added', server);
      
      this.logger.info(`MCP server ${config.name} added successfully`);
    } catch (error) {
      this.logger.error(`Failed to add MCP server ${config.name}`, error);
      throw error;
    }
  }

  /**
   * Connect to an MCP server
   */
  private async connectServer(server: MCPServer): Promise<void> {
    // In a real implementation, this would establish actual connection
    // For now, we'll simulate the connection
    
    this.logger.info(`Connecting to ${server.name}...`);
    
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    server.status = 'connected';
    server.connection = {
      url: `http://localhost:${8010 + this.servers.size}/mcp`,
      protocol: 'jsonrpc',
      version: '2.0'
    };
    
    this.emit('server:connected', server);
  }

  /**
   * Discover available tools from an MCP server
   */
  private async discoverTools(server: MCPServer): Promise<void> {
    this.logger.info(`Discovering tools for ${server.name}...`);
    
    // Define tools based on server type
    const toolSets: Record<string, MCPTool[]> = {
      airtable: [
        { name: 'list_tables', description: 'List all tables', category: 'data' },
        { name: 'list_records', description: 'List records from a table', category: 'data' },
        { name: 'create_record', description: 'Create a new record', category: 'data' },
        { name: 'update_record', description: 'Update existing record', category: 'data' },
        { name: 'delete_record', description: 'Delete a record', category: 'data' },
        { name: 'batch_create_records', description: 'Create multiple records', category: 'batch' },
        { name: 'create_webhook', description: 'Create a webhook', category: 'webhooks' }
      ],
      supabase: [
        { name: 'query', description: 'Execute SQL query', category: 'data' },
        { name: 'insert', description: 'Insert data', category: 'data' },
        { name: 'update', description: 'Update data', category: 'data' },
        { name: 'delete', description: 'Delete data', category: 'data' },
        { name: 'rpc', description: 'Call database function', category: 'functions' },
        { name: 'subscribe', description: 'Subscribe to changes', category: 'realtime' }
      ]
    };
    
    server.tools = toolSets[server.name] || [];
    this.logger.info(`Discovered ${server.tools.length} tools for ${server.name}`);
  }

  /**
   * Execute a tool on an MCP server
   */
  async executeTool(
    serverName: string,
    toolName: string,
    parameters: any
  ): Promise<MCPResponse> {
    const server = this.getServerByName(serverName);
    
    if (!server) {
      throw new Error(`MCP server ${serverName} not found`);
    }
    
    if (server.status !== 'connected') {
      throw new Error(`MCP server ${serverName} is not connected`);
    }
    
    const tool = server.tools.find(t => t.name === toolName);
    if (!tool) {
      throw new Error(`Tool ${toolName} not found on server ${serverName}`);
    }
    
    this.logger.info(`Executing ${serverName}.${toolName}`);
    
    try {
      // In a real implementation, this would make actual MCP call
      // For now, we'll simulate the response
      const response: MCPResponse = {
        success: true,
        data: {
          message: `Executed ${toolName} on ${serverName}`,
          parameters,
          timestamp: new Date().toISOString()
        }
      };
      
      this.emit('tool:executed', {
        server: serverName,
        tool: toolName,
        response
      });
      
      return response;
    } catch (error) {
      this.logger.error(`Failed to execute ${serverName}.${toolName}`, error);
      throw error;
    }
  }

  /**
   * Get all connected servers
   */
  getServers(): MCPServer[] {
    return Array.from(this.servers.values());
  }

  /**
   * Get server by name
   */
  getServerByName(name: string): MCPServer | undefined {
    return Array.from(this.servers.values()).find(s => s.name === name);
  }

  /**
   * Get all available tools across all servers
   */
  getAllTools(): Array<{ server: string; tool: MCPTool }> {
    const allTools: Array<{ server: string; tool: MCPTool }> = [];
    
    for (const server of this.servers.values()) {
      for (const tool of server.tools) {
        allTools.push({ server: server.name, tool });
      }
    }
    
    return allTools;
  }

  /**
   * Check if required environment variables are set
   */
  private hasRequiredEnvVars(config: MCPServerConfig): boolean {
    if (config.name === 'airtable') {
      return !!(process.env.AIRTABLE_TOKEN && process.env.AIRTABLE_BASE_ID);
    }
    if (config.name === 'supabase') {
      return !!(process.env.SUPABASE_URL && process.env.SUPABASE_KEY);
    }
    return true;
  }

  /**
   * Shutdown all MCP connections
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down MCP Gateway...');
    
    for (const server of this.servers.values()) {
      server.status = 'disconnected';
      this.emit('server:disconnected', server);
    }
    
    this.servers.clear();
    this.removeAllListeners();
    
    this.logger.info('MCP Gateway shutdown complete');
  }
}