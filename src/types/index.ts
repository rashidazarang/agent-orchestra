/**
 * Type Definitions for Agent Orchestra
 */

// Core Types
export interface OrchestraConfig {
  mcp: MCPConfig;
  agents: AgentConfig;
  workflows: WorkflowConfig;
  observability: ObservabilityConfig;
}

export interface MCPConfig {
  servers: MCPServerConfig[];
  timeout: number;
  retries: number;
}

export interface AgentConfig {
  registry: 'local' | 'distributed';
  discovery: {
    enabled: boolean;
    interval: number;
  };
}

export interface WorkflowConfig {
  maxConcurrent: number;
  defaultTimeout: number;
  retryPolicy: {
    enabled: boolean;
    maxRetries: number;
    backoff: 'linear' | 'exponential';
  };
}

export interface ObservabilityConfig {
  traces: {
    enabled: boolean;
    exporter: 'console' | 'jaeger' | 'zipkin';
  };
  metrics: {
    enabled: boolean;
    exporter: 'console' | 'prometheus' | 'datadog';
  };
  logs: {
    enabled: boolean;
    level: 'debug' | 'info' | 'warn' | 'error';
  };
}

// MCP Types
export interface MCPServer {
  id: string;
  name: string;
  package: string;
  version: string;
  status: 'initializing' | 'connected' | 'disconnected' | 'error';
  config: any;
  tools: MCPTool[];
  connection: any;
}

export interface MCPServerConfig {
  name: string;
  package: string;
  version: string;
  config: any;
}

export interface MCPTool {
  name: string;
  description: string;
  category: string;
  parameters?: any;
}

export interface MCPResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// Agent Types
export interface Agent {
  id: string;
  name: string;
  type: string;
  status: AgentStatus;
  capabilities: string[];
  metadata?: Record<string, any>;
}

export interface SupervisorAgent extends Agent {
  subAgents: string[];
  maxSubAgents: number;
  registerSubAgent?: (agentId: string) => void;
  executeTask?: (task: any) => Promise<any>;
}

export type AgentStatus = 'online' | 'offline' | 'busy' | 'error';

export type AgentCapability = string;

// Workflow Types
export interface Workflow {
  id: string;
  name: string;
  pattern: OrchestrationPattern;
  description?: string;
  steps: WorkflowStep[];
  metadata: Record<string, any>;
  created: string;
  addStep?: (name: string, config: Partial<WorkflowStep>) => Workflow;
  execute?: () => Promise<ExecutionResult>;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'action' | 'condition' | 'supervisor' | 'parallel';
  agent?: string;
  action?: string;
  params?: Record<string, any>;
  input?: any;
  output?: any;
  conditions?: any;
  retries?: number;
  timeout?: number;
}

export type OrchestrationPattern = 
  | 'sequential' 
  | 'parallel' 
  | 'hierarchical' 
  | 'collaborative'
  | 'round-robin'
  | 'map-reduce'
  | 'pipeline';

// Execution Types
export interface ExecutionContext {
  executionId?: string;
  mcpGateway?: any;
  agentRegistry?: any;
  observability?: any;
}

export interface ExecutionResult {
  success: boolean;
  executionId: string;
  workflowId?: string;
  results?: any[];
  error?: string;
  duration?: number;
  metadata?: Record<string, any>;
}

// Protocol Types
export interface ACPMessage {
  type: 'task' | 'query' | 'response' | 'error';
  from: string;
  to: string;
  payload: any;
  timestamp: number;
}

export interface A2ATask {
  id: string;
  type: string;
  description: string;
  requirements: string[];
  constraints?: any;
  deadline?: string;
}

// Observability Types
export interface Span {
  name: string;
  attributes: Record<string, any>;
  startTime: number;
  endTime?: number;
  end: () => void;
}

export interface Metric {
  name: string;
  value: number;
  labels: Record<string, string>;
  timestamp: number;
}

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: any;
  timestamp: string;
}