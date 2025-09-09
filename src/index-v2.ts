/**
 * Agent Orchestra v2.0
 * 
 * The ultimate orchestration framework supporting multiple protocols
 * and domain-specific implementations
 */

// Core v2
export { OrchestraV2 } from './core/orchestra-v2';

// Protocol Bridges
export * from './protocols';

// Domain System
export * from './domains';

// Example Domain
export { PropertyManagementDomain } from './domains/property-management';

// Original exports (for backward compatibility)
export { Orchestra } from './core/orchestra';
export { MCPGateway } from './mcp/gateway';
export { AgentRegistry } from './agents/registry';
export { WorkflowEngine } from './workflows/engine';
export { ObservabilityManager } from './observability/manager';

// Workflow patterns
export { 
  SequentialWorkflow,
  ParallelWorkflow,
  HierarchicalWorkflow,
  CollaborativeWorkflow 
} from './workflows/patterns';

// Types
export * from './types';

// Utilities
export * from './utils';

// Version
export const VERSION = '2.0.0';

/**
 * Quick start function for v2
 */
export async function createOrchestraV2(config?: any) {
  const { OrchestraV2 } = await import('./core/orchestra-v2');
  const orchestra = new OrchestraV2(config);
  
  // Auto-register property management domain if requested
  if (config?.domains?.includes('property-management')) {
    const { PropertyManagementDomain } = await import('./domains/property-management');
    orchestra.registerDomain(new PropertyManagementDomain());
  }
  
  await orchestra.initialize();
  return orchestra;
}

/**
 * Create PropSync-ready orchestra
 */
export async function createPropSyncOrchestra() {
  return createOrchestraV2({
    protocols: {
      mcp: true,
      rest: true,
      soap: true,    // For PropertyWare
      lambda: true   // For GreenLight sync
    },
    domains: ['property-management']
  });
}