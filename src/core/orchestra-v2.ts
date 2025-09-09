/**
 * Agent Orchestra v2.0
 * 
 * Enhanced with multi-protocol support and domain system
 * This becomes the backbone for any orchestration need
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { 
  MCPBridge,
  RESTBridge, 
  SOAPBridge,
  GraphQLBridge,
  WebSocketBridge,
  LambdaBridge,
  ProtocolBridge
} from '../protocols';
import { DomainRegistry, Domain } from '../domains';
import { AgentRegistry } from '../agents/registry';
import { WorkflowEngine } from '../workflows/engine';
import { ObservabilityManager } from '../observability/manager';
import { Logger } from '../utils/logger';

interface OrchestraV2Config {
  protocols?: {
    mcp?: boolean;
    rest?: boolean;
    soap?: boolean;
    graphql?: boolean;
    websocket?: boolean;
    lambda?: boolean;
  };
  domains?: string[];
  observability?: any;
}

export class OrchestraV2 extends EventEmitter {
  private id: string;
  private protocols: Map<string, ProtocolBridge> = new Map();
  private domainRegistry: DomainRegistry;
  private agentRegistry: AgentRegistry;
  private workflowEngine: WorkflowEngine;
  private observability: ObservabilityManager;
  private logger: Logger;
  private isInitialized: boolean = false;

  constructor(config?: OrchestraV2Config) {
    super();
    this.id = uuidv4();
    this.logger = new Logger('OrchestraV2');
    
    // Initialize registries
    this.domainRegistry = new DomainRegistry();
    this.agentRegistry = new AgentRegistry({});
    this.workflowEngine = new WorkflowEngine({});
    this.observability = new ObservabilityManager(config?.observability || {});
    
    // Initialize protocol bridges based on config
    this.initializeProtocols(config?.protocols);
    
    this.logger.info(`Orchestra v2.0 initialized with ID: ${this.id}`);
  }

  /**
   * Initialize protocol bridges
   */
  private initializeProtocols(protocolConfig?: any) {
    const defaultProtocols = {
      mcp: true,
      rest: true,
      soap: false,
      graphql: false,
      websocket: false,
      lambda: false,
      ...protocolConfig
    };

    if (defaultProtocols.mcp) {
      this.protocols.set('mcp', new MCPBridge());
    }
    if (defaultProtocols.rest) {
      this.protocols.set('rest', new RESTBridge());
    }
    if (defaultProtocols.soap) {
      this.protocols.set('soap', new SOAPBridge());
    }
    if (defaultProtocols.graphql) {
      this.protocols.set('graphql', new GraphQLBridge());
    }
    if (defaultProtocols.websocket) {
      this.protocols.set('websocket', new WebSocketBridge());
    }
    if (defaultProtocols.lambda) {
      this.protocols.set('lambda', new LambdaBridge());
    }

    this.logger.info(`Initialized ${this.protocols.size} protocol bridges`);
  }

  /**
   * Initialize the orchestra
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('Orchestra already initialized');
      return;
    }

    this.logger.info('Initializing Orchestra v2.0...');

    // Initialize all protocol bridges
    for (const [name, bridge] of this.protocols) {
      this.logger.info(`Initializing ${name} bridge...`);
      await bridge.initialize();
    }

    // Initialize domains
    await this.domainRegistry.initializeAll();

    // Initialize other components
    await this.agentRegistry.initialize();
    await this.workflowEngine.initialize();
    await this.observability.initialize();

    this.isInitialized = true;
    this.logger.info('Orchestra v2.0 initialization complete');
  }

  /**
   * Register a domain
   */
  registerDomain(domain: Domain): void {
    this.domainRegistry.register(domain);
    
    // Register domain agents
    for (const agent of domain.getAgents()) {
      this.agentRegistry.register({
        id: agent.id,
        name: agent.name,
        type: agent.protocol,
        status: 'offline',
        capabilities: agent.capabilities
      });
    }
    
    // Register domain workflows
    for (const workflow of domain.getWorkflows()) {
      this.workflowEngine.registerWorkflow(workflow);
    }
    
    this.logger.info(`Registered domain: ${domain.name}`);
  }

  /**
   * Execute operation through appropriate protocol
   */
  async execute(protocol: string, operation: string, params?: any): Promise<any> {
    const bridge = this.protocols.get(protocol);
    
    if (!bridge) {
      throw new Error(`Protocol ${protocol} not supported`);
    }
    
    const span = this.observability.startSpan('operation.execute', {
      protocol,
      operation
    });
    
    try {
      const result = await bridge.execute(operation, params);
      span.end();
      
      this.observability.recordMetric('operation.success', 1, {
        protocol,
        operation
      });
      
      return result;
    } catch (error) {
      span.end();
      
      this.observability.recordMetric('operation.error', 1, {
        protocol,
        operation,
        error: error.message
      });
      
      throw error;
    }
  }

  /**
   * Execute a cross-protocol workflow
   */
  async executeWorkflow(workflowId: string, params?: any): Promise<any> {
    const workflow = this.workflowEngine.getWorkflow(workflowId);
    
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }
    
    this.logger.info(`Executing workflow: ${workflowId}`);
    const results = [];
    
    for (const step of workflow.steps) {
      // Determine protocol from agent type
      const agent = this.agentRegistry.get(step.agent);
      const protocol = agent?.type || 'mcp';
      
      const stepResult = await this.execute(
        protocol,
        step.tool,
        step.params || params
      );
      
      results.push({
        step: step.name,
        result: stepResult
      });
    }
    
    return {
      workflow: workflowId,
      results
    };
  }

  /**
   * Get available capabilities
   */
  getCapabilities(): any {
    return {
      protocols: Array.from(this.protocols.keys()),
      domains: this.domainRegistry.list().map(d => ({
        name: d.name,
        version: d.version
      })),
      agents: this.agentRegistry.list().length,
      workflows: this.workflowEngine.getWorkflows().length
    };
  }

  /**
   * Add MCP server (convenience method)
   */
  async addMCPServer(config: any): Promise<void> {
    const mcpBridge = this.protocols.get('mcp') as MCPBridge;
    if (mcpBridge) {
      await mcpBridge.addServer(config);
    }
  }

  /**
   * Add REST endpoint (convenience method)
   */
  addRESTEndpoint(config: any): void {
    const restBridge = this.protocols.get('rest') as RESTBridge;
    if (restBridge) {
      restBridge.registerEndpoint(config);
    }
  }

  /**
   * Universal query method
   */
  async query(query: string): Promise<any> {
    // Intelligent query routing across all protocols
    this.logger.info(`Processing query: ${query}`);
    
    // Try to understand intent
    const intent = this.parseIntent(query);
    
    // Route to appropriate protocol/domain
    if (intent.domain) {
      const domain = this.domainRegistry.get(intent.domain);
      if (domain) {
        // Execute domain-specific logic
        const tool = domain.getTools().find(t => 
          t.name.toLowerCase().includes(intent.action.toLowerCase())
        );
        
        if (tool) {
          return tool.execute(intent.params);
        }
      }
    }
    
    // Fallback to protocol routing
    if (intent.protocol) {
      return this.execute(intent.protocol, intent.action, intent.params);
    }
    
    throw new Error(`Cannot understand query: ${query}`);
  }

  /**
   * Parse intent from query
   */
  private parseIntent(query: string): any {
    // Simple intent parsing - in production, use NLP
    const lower = query.toLowerCase();
    
    return {
      domain: lower.includes('property') ? 'property-management' : null,
      protocol: lower.includes('mcp') ? 'mcp' : 'rest',
      action: 'query',
      params: { query }
    };
  }

  /**
   * Shutdown
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Orchestra v2.0...');
    
    // Shutdown all protocols
    for (const bridge of this.protocols.values()) {
      await bridge.shutdown();
    }
    
    await this.agentRegistry.shutdown();
    await this.workflowEngine.shutdown();
    await this.observability.shutdown();
    
    this.logger.info('Orchestra v2.0 shutdown complete');
  }
}