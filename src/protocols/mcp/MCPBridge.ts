/**
 * MCP Bridge - Integrates MCP Orchestrator into Agent Orchestra
 * 
 * This bridges our MCP Orchestrator as a protocol within Agent Orchestra
 */

import { EventEmitter } from 'events';
import { ProtocolBridge } from '../index';
import { Logger } from '../../utils/logger';

export class MCPBridge extends EventEmitter implements ProtocolBridge {
  name = 'mcp';
  private logger: Logger;
  private orchestrator: any; // Will import from mcp-orchestrator package
  private servers: Map<string, any> = new Map();

  constructor() {
    super();
    this.logger = new Logger('MCPBridge');
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing MCP Bridge with MCP Orchestrator...');
    
    try {
      // Import and initialize MCP Orchestrator
      // In production, this would import from @mcp-orchestrator/server
      const { MCPOrchestrator } = await import('../../../mcp-orchestrator/src/core/orchestrator');
      
      this.orchestrator = new MCPOrchestrator();
      await this.orchestrator.initialize({
        servers: this.getConfiguredServers(),
        routing: {
          smartRouting: true,
          cacheEnabled: true,
          parallelExecution: true
        }
      });
      
      this.logger.info('MCP Bridge initialized with MCP Orchestrator');
    } catch (error) {
      this.logger.error('Failed to initialize MCP Bridge', error);
      throw error;
    }
  }

  async execute(operation: string, params: any): Promise<any> {
    this.logger.info(`Executing MCP operation: ${operation}`);
    
    // Route through MCP Orchestrator
    if (operation.includes('.')) {
      // Direct server.tool format
      const [server, tool] = operation.split('.');
      return this.orchestrator.executeOnServer(server, tool, params);
    }
    
    // Use orchestrator's intelligent routing
    return this.orchestrator.executeTool(operation, params);
  }

  async addServer(config: {
    name: string;
    package?: string;
    path?: string;
    env?: Record<string, string>;
  }): Promise<void> {
    this.logger.info(`Adding MCP server: ${config.name}`);
    this.servers.set(config.name, config);
    
    // Reinitialize orchestrator with new server
    if (this.orchestrator) {
      await this.orchestrator.initialize({
        servers: this.getConfiguredServers()
      });
    }
  }

  async listTools(): Promise<any[]> {
    return this.orchestrator.getAllTools();
  }

  async executeWorkflow(workflow: string, params: any): Promise<any> {
    return this.orchestrator.executeTool(`workflow_${workflow}`, params);
  }

  private getConfiguredServers(): any[] {
    return Array.from(this.servers.values());
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down MCP Bridge...');
    if (this.orchestrator) {
      await this.orchestrator.shutdown();
    }
  }
}