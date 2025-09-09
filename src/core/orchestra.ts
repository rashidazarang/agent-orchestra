/**
 * Core Orchestration Engine
 * 
 * Manages the lifecycle of multi-agent workflows and coordinates
 * between different protocols (MCP, ACP, A2A)
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { MCPGateway } from '../mcp/gateway';
import { AgentRegistry } from '../agents/registry';
import { WorkflowEngine } from '../workflows/engine';
import { ObservabilityManager } from '../observability/manager';
import { 
  OrchestraConfig, 
  Workflow, 
  Agent, 
  ExecutionResult,
  OrchestrationPattern 
} from '../types';
import { Logger } from '../utils/logger';

export class Orchestra extends EventEmitter {
  private id: string;
  private config: OrchestraConfig;
  private mcpGateway: MCPGateway;
  private agentRegistry: AgentRegistry;
  private workflowEngine: WorkflowEngine;
  private observability: ObservabilityManager;
  private logger: Logger;
  private isInitialized: boolean = false;

  constructor(config?: Partial<OrchestraConfig>) {
    super();
    this.id = uuidv4();
    this.config = this.mergeConfig(config);
    this.logger = new Logger('Orchestra');
    
    // Initialize components
    this.mcpGateway = new MCPGateway(this.config.mcp);
    this.agentRegistry = new AgentRegistry(this.config.agents);
    this.workflowEngine = new WorkflowEngine(this.config.workflows);
    this.observability = new ObservabilityManager(this.config.observability);
    
    this.logger.info(`Orchestra ${this.id} created`);
  }

  /**
   * Initialize the orchestration framework
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('Orchestra already initialized');
      return;
    }

    try {
      this.logger.info('Initializing Orchestra components...');
      
      // Initialize MCP Gateway
      await this.mcpGateway.initialize();
      this.logger.info('MCP Gateway initialized');
      
      // Initialize Agent Registry
      await this.agentRegistry.initialize();
      this.logger.info('Agent Registry initialized');
      
      // Initialize Workflow Engine
      await this.workflowEngine.initialize();
      this.logger.info('Workflow Engine initialized');
      
      // Initialize Observability
      await this.observability.initialize();
      this.logger.info('Observability initialized');
      
      // Setup event handlers
      this.setupEventHandlers();
      
      this.isInitialized = true;
      this.emit('initialized', { orchestraId: this.id });
      this.logger.info('Orchestra initialization complete');
      
    } catch (error) {
      this.logger.error('Failed to initialize Orchestra', error);
      throw error;
    }
  }

  /**
   * Create a new workflow
   */
  createWorkflow(options: {
    name: string;
    pattern: OrchestrationPattern;
    description?: string;
    metadata?: Record<string, any>;
  }): Workflow {
    const workflow = this.workflowEngine.createWorkflow(options);
    this.logger.info(`Created workflow: ${workflow.id}`);
    return workflow;
  }

  /**
   * Register a new agent
   */
  async registerAgent(agent: Agent): Promise<void> {
    await this.agentRegistry.register(agent);
    this.logger.info(`Registered agent: ${agent.id}`);
    this.emit('agent:registered', agent);
  }

  /**
   * Execute a workflow
   */
  async execute(workflow: Workflow | string): Promise<ExecutionResult> {
    const startTime = Date.now();
    const executionId = uuidv4();
    
    try {
      // Get workflow
      const wf = typeof workflow === 'string' 
        ? await this.workflowEngine.getWorkflow(workflow)
        : workflow;
      
      this.logger.info(`Starting execution ${executionId} for workflow ${wf.id}`);
      this.emit('execution:started', { executionId, workflowId: wf.id });
      
      // Start observability tracking
      const span = this.observability.startSpan('workflow.execution', {
        executionId,
        workflowId: wf.id,
        pattern: wf.pattern
      });
      
      // Execute workflow
      const result = await this.workflowEngine.execute(wf, {
        executionId,
        mcpGateway: this.mcpGateway,
        agentRegistry: this.agentRegistry,
        observability: this.observability
      });
      
      // Record metrics
      const duration = Date.now() - startTime;
      this.observability.recordMetric('workflow.execution.duration', duration, {
        pattern: wf.pattern,
        success: result.success
      });
      
      span.end();
      
      this.logger.info(`Execution ${executionId} completed in ${duration}ms`);
      this.emit('execution:completed', { executionId, result, duration });
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logger.error(`Execution ${executionId} failed`, error);
      this.observability.recordMetric('workflow.execution.error', 1, {
        error: error.message
      });
      
      this.emit('execution:failed', { executionId, error, duration });
      
      return {
        success: false,
        executionId,
        error: error.message,
        duration
      };
    }
  }

  /**
   * Create a supervisor agent for hierarchical orchestration
   */
  createSupervisor(options: {
    name: string;
    capabilities: string[];
    maxSubAgents?: number;
  }) {
    const supervisor = this.agentRegistry.createSupervisor(options);
    this.logger.info(`Created supervisor: ${supervisor.id}`);
    return supervisor;
  }

  /**
   * Get available MCP servers
   */
  async getMCPServers(): Promise<any[]> {
    return this.mcpGateway.getServers();
  }

  /**
   * Get registered agents
   */
  async getAgents(): Promise<Agent[]> {
    return this.agentRegistry.list();
  }

  /**
   * Get workflow history
   */
  async getWorkflowHistory(limit: number = 100): Promise<any[]> {
    return this.workflowEngine.getHistory(limit);
  }

  /**
   * Get metrics
   */
  async getMetrics(): Promise<any> {
    return this.observability.getMetrics();
  }

  /**
   * Shutdown the orchestrator
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Orchestra...');
    
    await this.workflowEngine.shutdown();
    await this.agentRegistry.shutdown();
    await this.mcpGateway.shutdown();
    await this.observability.shutdown();
    
    this.removeAllListeners();
    this.isInitialized = false;
    
    this.logger.info('Orchestra shutdown complete');
  }

  /**
   * Setup internal event handlers
   */
  private setupEventHandlers(): void {
    // MCP Gateway events
    this.mcpGateway.on('server:connected', (server) => {
      this.emit('mcp:server:connected', server);
    });
    
    this.mcpGateway.on('server:disconnected', (server) => {
      this.emit('mcp:server:disconnected', server);
    });
    
    // Agent Registry events
    this.agentRegistry.on('agent:online', (agent) => {
      this.emit('agent:online', agent);
    });
    
    this.agentRegistry.on('agent:offline', (agent) => {
      this.emit('agent:offline', agent);
    });
    
    // Workflow Engine events
    this.workflowEngine.on('step:started', (data) => {
      this.emit('workflow:step:started', data);
    });
    
    this.workflowEngine.on('step:completed', (data) => {
      this.emit('workflow:step:completed', data);
    });
    
    this.workflowEngine.on('step:failed', (data) => {
      this.emit('workflow:step:failed', data);
    });
  }

  /**
   * Merge configuration with defaults
   */
  private mergeConfig(config?: Partial<OrchestraConfig>): OrchestraConfig {
    const defaults: OrchestraConfig = {
      mcp: {
        servers: [],
        timeout: 30000,
        retries: 3
      },
      agents: {
        registry: 'local',
        discovery: {
          enabled: true,
          interval: 60000
        }
      },
      workflows: {
        maxConcurrent: 10,
        defaultTimeout: 300000,
        retryPolicy: {
          enabled: true,
          maxRetries: 3,
          backoff: 'exponential'
        }
      },
      observability: {
        traces: {
          enabled: true,
          exporter: 'console'
        },
        metrics: {
          enabled: true,
          exporter: 'console'
        },
        logs: {
          enabled: true,
          level: 'info'
        }
      }
    };
    
    return { ...defaults, ...config };
  }
}