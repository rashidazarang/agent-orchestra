/**
 * Agent Orchestra - Universal Multi-Agent Orchestration Framework
 * 
 * Main entry point for the orchestration framework
 */

export { Orchestra } from './core/orchestra';
export { MCPGateway } from './mcp/gateway';
export { AgentRegistry } from './agents/registry';
export { WorkflowEngine } from './workflows/engine';
export { ObservabilityManager } from './observability/manager';

// Export workflow patterns
export { 
  SequentialWorkflow,
  ParallelWorkflow,
  HierarchicalWorkflow,
  CollaborativeWorkflow 
} from './workflows/patterns';

// Export types
export * from './types';

// Export utilities
export * from './utils';

// Version
export const VERSION = '0.1.0';

/**
 * Quick start function for easy initialization
 */
export async function createOrchestra(config?: any) {
  const { Orchestra } = await import('./core/orchestra');
  return new Orchestra(config);
}