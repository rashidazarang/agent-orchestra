/**
 * Domain System for Agent Orchestra
 * 
 * Allows vertical-specific implementations (PropSync, Healthcare, Finance, etc.)
 */

export interface Domain {
  name: string;
  version: string;
  description: string;
  initialize(): Promise<void>;
  getWorkflows(): DomainWorkflow[];
  getAgents(): DomainAgent[];
  getTools(): DomainTool[];
}

export interface DomainWorkflow {
  id: string;
  name: string;
  description: string;
  category: string;
  steps: WorkflowStep[];
  triggers?: WorkflowTrigger[];
}

export interface DomainAgent {
  id: string;
  name: string;
  capabilities: string[];
  protocol: string;
  config: any;
}

export interface DomainTool {
  id: string;
  name: string;
  description: string;
  category: string;
  execute: (params: any) => Promise<any>;
}

export interface WorkflowStep {
  name: string;
  agent?: string;
  tool?: string;
  params?: any;
  condition?: any;
  transform?: any;
}

export interface WorkflowTrigger {
  type: 'schedule' | 'webhook' | 'event' | 'manual';
  config: any;
}

export class DomainRegistry {
  private domains: Map<string, Domain> = new Map();

  register(domain: Domain): void {
    this.domains.set(domain.name, domain);
    console.log(`Registered domain: ${domain.name} v${domain.version}`);
  }

  get(name: string): Domain | undefined {
    return this.domains.get(name);
  }

  list(): Domain[] {
    return Array.from(this.domains.values());
  }

  async initializeAll(): Promise<void> {
    for (const domain of this.domains.values()) {
      await domain.initialize();
    }
  }
}