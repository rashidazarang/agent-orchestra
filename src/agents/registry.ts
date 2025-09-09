/**
 * Agent Registry
 * 
 * Manages agent registration, discovery, and lifecycle
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { Agent, AgentCapability, AgentStatus, SupervisorAgent } from '../types';
import { Logger } from '../utils/logger';

export class AgentRegistry extends EventEmitter {
  private agents: Map<string, Agent> = new Map();
  private supervisors: Map<string, SupervisorAgent> = new Map();
  private logger: Logger;
  private config: any;

  constructor(config: any) {
    super();
    this.config = config;
    this.logger = new Logger('AgentRegistry');
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing Agent Registry...');
    
    // Start discovery service if enabled
    if (this.config.discovery?.enabled) {
      this.startDiscoveryService();
    }
    
    // Register default agents
    await this.registerDefaultAgents();
    
    this.logger.info(`Agent Registry initialized with ${this.agents.size} agents`);
  }

  /**
   * Register default agents
   */
  private async registerDefaultAgents(): Promise<void> {
    const defaultAgents: Agent[] = [
      {
        id: 'orchestrator-001',
        name: 'Default Orchestrator',
        type: 'orchestrator',
        status: 'online',
        capabilities: ['task-planning', 'agent-coordination', 'error-recovery'],
        metadata: {
          version: '1.0.0',
          priority: 100
        }
      },
      {
        id: 'data-analyst-001',
        name: 'Data Analyst',
        type: 'analyst',
        status: 'online',
        capabilities: ['data-analysis', 'visualization', 'reporting'],
        metadata: {
          version: '1.0.0',
          supportedFormats: ['csv', 'json', 'excel']
        }
      }
    ];

    for (const agent of defaultAgents) {
      await this.register(agent);
    }
  }

  /**
   * Register a new agent
   */
  async register(agent: Agent): Promise<void> {
    if (!agent.id) {
      agent.id = uuidv4();
    }

    if (this.agents.has(agent.id)) {
      throw new Error(`Agent ${agent.id} already registered`);
    }

    // Set default status
    if (!agent.status) {
      agent.status = 'offline';
    }

    // Validate capabilities
    this.validateCapabilities(agent.capabilities);

    this.agents.set(agent.id, agent);
    this.logger.info(`Registered agent: ${agent.name} (${agent.id})`);
    
    // Simulate agent coming online
    setTimeout(() => {
      agent.status = 'online';
      this.emit('agent:online', agent);
    }, 1000);

    this.emit('agent:registered', agent);
  }

  /**
   * Unregister an agent
   */
  async unregister(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    this.agents.delete(agentId);
    this.logger.info(`Unregistered agent: ${agent.name} (${agentId})`);
    
    this.emit('agent:unregistered', agent);
  }

  /**
   * Get an agent by ID
   */
  get(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get an agent by name
   */
  getByName(name: string): Agent | undefined {
    return Array.from(this.agents.values()).find(a => a.name === name);
  }

  /**
   * List all agents
   */
  list(filter?: {
    type?: string;
    status?: AgentStatus;
    capability?: string;
  }): Agent[] {
    let agents = Array.from(this.agents.values());

    if (filter) {
      if (filter.type) {
        agents = agents.filter(a => a.type === filter.type);
      }
      if (filter.status) {
        agents = agents.filter(a => a.status === filter.status);
      }
      if (filter.capability) {
        agents = agents.filter(a => a.capabilities.includes(filter.capability));
      }
    }

    return agents;
  }

  /**
   * Find agents by capability
   */
  findByCapability(capability: string): Agent[] {
    return Array.from(this.agents.values())
      .filter(agent => agent.capabilities.includes(capability));
  }

  /**
   * Create a supervisor agent
   */
  createSupervisor(options: {
    name: string;
    capabilities: string[];
    maxSubAgents?: number;
  }): SupervisorAgent {
    const supervisor: SupervisorAgent = {
      id: `supervisor-${uuidv4()}`,
      name: options.name,
      type: 'supervisor',
      status: 'online',
      capabilities: options.capabilities,
      subAgents: [],
      maxSubAgents: options.maxSubAgents || 10,
      metadata: {
        created: new Date().toISOString()
      }
    };

    // Add supervisor-specific methods
    const supervisorWithMethods = {
      ...supervisor,
      
      registerSubAgent: (agentId: string) => {
        const agent = this.agents.get(agentId);
        if (!agent) {
          throw new Error(`Agent ${agentId} not found`);
        }
        
        if (supervisor.subAgents.length >= supervisor.maxSubAgents) {
          throw new Error(`Supervisor ${supervisor.id} has reached max sub-agents`);
        }
        
        supervisor.subAgents.push(agentId);
        this.logger.info(`Agent ${agentId} registered under supervisor ${supervisor.id}`);
      },
      
      executeTask: async (task: any) => {
        this.logger.info(`Supervisor ${supervisor.id} executing task`);
        
        // Delegate to sub-agents based on task requirements
        const results = [];
        
        for (const agentId of supervisor.subAgents) {
          const agent = this.agents.get(agentId);
          if (agent && agent.status === 'online') {
            // Simulate task execution
            results.push({
              agentId,
              result: `Task executed by ${agent.name}`
            });
          }
        }
        
        return {
          supervisorId: supervisor.id,
          task,
          results
        };
      }
    };

    this.supervisors.set(supervisor.id, supervisorWithMethods);
    this.agents.set(supervisor.id, supervisor);
    
    this.logger.info(`Created supervisor: ${supervisor.name} (${supervisor.id})`);
    this.emit('supervisor:created', supervisor);
    
    return supervisorWithMethods;
  }

  /**
   * Update agent status
   */
  updateStatus(agentId: string, status: AgentStatus): void {
    const agent = this.agents.get(agentId);
    
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    const oldStatus = agent.status;
    agent.status = status;
    
    this.logger.info(`Agent ${agent.name} status: ${oldStatus} → ${status}`);
    
    if (status === 'online' && oldStatus !== 'online') {
      this.emit('agent:online', agent);
    } else if (status === 'offline' && oldStatus !== 'offline') {
      this.emit('agent:offline', agent);
    }
    
    this.emit('agent:status:changed', { agent, oldStatus, newStatus: status });
  }

  /**
   * Validate agent capabilities
   */
  private validateCapabilities(capabilities: string[]): void {
    const validCapabilities = [
      'task-planning',
      'agent-coordination',
      'error-recovery',
      'data-analysis',
      'visualization',
      'reporting',
      'data-manipulation',
      'schema-management',
      'webhook-handling',
      'statistical-analysis',
      'natural-language-processing',
      'code-generation'
    ];

    for (const capability of capabilities) {
      if (!validCapabilities.includes(capability)) {
        this.logger.warn(`Unknown capability: ${capability}`);
      }
    }
  }

  /**
   * Start agent discovery service
   */
  private startDiscoveryService(): void {
    this.logger.info('Starting agent discovery service...');
    
    setInterval(() => {
      // Simulate discovering new agents
      const chance = Math.random();
      
      if (chance < 0.1) { // 10% chance of discovering new agent
        const newAgent: Agent = {
          id: `discovered-${uuidv4()}`,
          name: `Discovered Agent ${Date.now()}`,
          type: 'worker',
          status: 'online',
          capabilities: ['data-processing'],
          metadata: {
            discoveredAt: new Date().toISOString()
          }
        };
        
        this.register(newAgent).catch(err => {
          this.logger.error('Failed to register discovered agent', err);
        });
      }
    }, this.config.discovery.interval || 60000);
  }

  /**
   * Get registry statistics
   */
  getStats(): any {
    const agents = Array.from(this.agents.values());
    
    return {
      total: agents.length,
      online: agents.filter(a => a.status === 'online').length,
      offline: agents.filter(a => a.status === 'offline').length,
      busy: agents.filter(a => a.status === 'busy').length,
      byType: this.groupByType(agents),
      supervisors: this.supervisors.size
    };
  }

  /**
   * Group agents by type
   */
  private groupByType(agents: Agent[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    
    for (const agent of agents) {
      grouped[agent.type] = (grouped[agent.type] || 0) + 1;
    }
    
    return grouped;
  }

  /**
   * Shutdown the registry
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Agent Registry...');
    
    // Set all agents to offline
    for (const agent of this.agents.values()) {
      agent.status = 'offline';
      this.emit('agent:offline', agent);
    }
    
    this.agents.clear();
    this.supervisors.clear();
    this.removeAllListeners();
    
    this.logger.info('Agent Registry shutdown complete');
  }
}