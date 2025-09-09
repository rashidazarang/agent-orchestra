/**
 * Workflow Engine
 * 
 * Executes workflows with different orchestration patterns
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { 
  Workflow, 
  WorkflowStep, 
  ExecutionResult,
  ExecutionContext,
  OrchestrationPattern 
} from '../types';
import { Logger } from '../utils/logger';
import { 
  SequentialWorkflow,
  ParallelWorkflow,
  HierarchicalWorkflow,
  CollaborativeWorkflow
} from './patterns';

export class WorkflowEngine extends EventEmitter {
  private workflows: Map<string, Workflow> = new Map();
  private executions: Map<string, ExecutionResult> = new Map();
  private logger: Logger;
  private config: any;
  private activeExecutions: number = 0;

  constructor(config: any) {
    super();
    this.config = config;
    this.logger = new Logger('WorkflowEngine');
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing Workflow Engine...');
    
    // Setup cleanup interval for old executions
    setInterval(() => {
      this.cleanupOldExecutions();
    }, 3600000); // Every hour
    
    this.logger.info('Workflow Engine initialized');
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
    const workflow: Workflow = {
      id: `workflow-${uuidv4()}`,
      name: options.name,
      pattern: options.pattern,
      description: options.description,
      steps: [],
      metadata: options.metadata || {},
      created: new Date().toISOString(),
      
      // Add methods to the workflow object
      addStep: (name: string, config: Partial<WorkflowStep>) => {
        const step: WorkflowStep = {
          id: `step-${uuidv4()}`,
          name,
          type: config.type || 'action',
          agent: config.agent,
          action: config.action,
          params: config.params || {},
          input: config.input,
          output: config.output,
          conditions: config.conditions,
          retries: config.retries || this.config.retryPolicy.maxRetries,
          timeout: config.timeout || this.config.defaultTimeout
        };
        
        workflow.steps.push(step);
        return workflow;
      },
      
      execute: async () => {
        return this.execute(workflow);
      }
    };

    this.workflows.set(workflow.id, workflow);
    this.logger.info(`Created workflow: ${workflow.name} (${workflow.id})`);
    
    return workflow;
  }

  /**
   * Get a workflow by ID
   */
  async getWorkflow(workflowId: string): Promise<Workflow> {
    const workflow = this.workflows.get(workflowId);
    
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }
    
    return workflow;
  }

  /**
   * Execute a workflow
   */
  async execute(
    workflow: Workflow,
    context?: ExecutionContext
  ): Promise<ExecutionResult> {
    // Check concurrent execution limit
    if (this.activeExecutions >= this.config.maxConcurrent) {
      throw new Error('Maximum concurrent executions reached');
    }

    this.activeExecutions++;
    const executionId = context?.executionId || uuidv4();
    const startTime = Date.now();

    this.logger.info(`Starting execution ${executionId} for workflow ${workflow.id}`);
    this.emit('execution:started', { executionId, workflowId: workflow.id });

    try {
      let result: ExecutionResult;

      // Execute based on pattern
      switch (workflow.pattern) {
        case 'sequential':
          result = await this.executeSequential(workflow, executionId, context);
          break;
          
        case 'parallel':
          result = await this.executeParallel(workflow, executionId, context);
          break;
          
        case 'hierarchical':
          result = await this.executeHierarchical(workflow, executionId, context);
          break;
          
        case 'collaborative':
          result = await this.executeCollaborative(workflow, executionId, context);
          break;
          
        default:
          throw new Error(`Unknown orchestration pattern: ${workflow.pattern}`);
      }

      result.duration = Date.now() - startTime;
      this.executions.set(executionId, result);
      
      this.logger.info(`Execution ${executionId} completed in ${result.duration}ms`);
      this.emit('execution:completed', { executionId, result });
      
      return result;
      
    } catch (error) {
      const result: ExecutionResult = {
        success: false,
        executionId,
        workflowId: workflow.id,
        error: error.message,
        duration: Date.now() - startTime
      };
      
      this.executions.set(executionId, result);
      
      this.logger.error(`Execution ${executionId} failed`, error);
      this.emit('execution:failed', { executionId, error });
      
      return result;
      
    } finally {
      this.activeExecutions--;
    }
  }

  /**
   * Execute workflow sequentially
   */
  private async executeSequential(
    workflow: Workflow,
    executionId: string,
    context?: ExecutionContext
  ): Promise<ExecutionResult> {
    const sequential = new SequentialWorkflow(workflow);
    const results: any[] = [];
    let previousOutput: any = null;

    for (const step of workflow.steps) {
      this.emit('step:started', { executionId, step: step.name });
      
      try {
        // Prepare step input
        let input = step.input;
        if (typeof input === 'string' && input.startsWith('{{') && input.endsWith('}}')) {
          // Use previous step output
          input = previousOutput;
        }

        // Execute step
        const stepResult = await this.executeStep(step, input, context);
        results.push({
          step: step.name,
          success: true,
          output: stepResult
        });
        
        previousOutput = stepResult;
        
        this.emit('step:completed', { 
          executionId, 
          step: step.name,
          output: stepResult 
        });
        
      } catch (error) {
        this.emit('step:failed', { 
          executionId, 
          step: step.name,
          error: error.message 
        });
        
        // Handle retry logic
        if (step.retries > 0) {
          this.logger.info(`Retrying step ${step.name} (${step.retries} attempts remaining)`);
          step.retries--;
          // Add step back to queue
          workflow.steps.unshift(step);
        } else {
          throw error;
        }
      }
    }

    return {
      success: true,
      executionId,
      workflowId: workflow.id,
      results
    };
  }

  /**
   * Execute workflow in parallel
   */
  private async executeParallel(
    workflow: Workflow,
    executionId: string,
    context?: ExecutionContext
  ): Promise<ExecutionResult> {
    const parallel = new ParallelWorkflow(workflow);
    
    this.logger.info(`Executing ${workflow.steps.length} steps in parallel`);
    
    const promises = workflow.steps.map(step => 
      this.executeStep(step, step.input, context)
        .then(output => ({
          step: step.name,
          success: true,
          output
        }))
        .catch(error => ({
          step: step.name,
          success: false,
          error: error.message
        }))
    );

    const results = await Promise.all(promises);
    const hasFailures = results.some(r => !r.success);

    return {
      success: !hasFailures,
      executionId,
      workflowId: workflow.id,
      results
    };
  }

  /**
   * Execute workflow hierarchically
   */
  private async executeHierarchical(
    workflow: Workflow,
    executionId: string,
    context?: ExecutionContext
  ): Promise<ExecutionResult> {
    const hierarchical = new HierarchicalWorkflow(workflow);
    
    // Find supervisor step
    const supervisorStep = workflow.steps.find(s => s.type === 'supervisor');
    
    if (!supervisorStep) {
      throw new Error('Hierarchical workflow requires a supervisor step');
    }

    // Execute supervisor
    const supervisorResult = await this.executeStep(supervisorStep, null, context);
    
    // Execute sub-tasks based on supervisor decision
    const subTasks = workflow.steps.filter(s => s.type !== 'supervisor');
    const results = [{ 
      step: supervisorStep.name, 
      success: true, 
      output: supervisorResult 
    }];

    for (const task of subTasks) {
      const result = await this.executeStep(task, supervisorResult, context);
      results.push({
        step: task.name,
        success: true,
        output: result
      });
    }

    return {
      success: true,
      executionId,
      workflowId: workflow.id,
      results
    };
  }

  /**
   * Execute workflow collaboratively
   */
  private async executeCollaborative(
    workflow: Workflow,
    executionId: string,
    context?: ExecutionContext
  ): Promise<ExecutionResult> {
    const collaborative = new CollaborativeWorkflow(workflow);
    
    // Create shared context for collaboration
    const sharedContext = {
      executionId,
      messages: [],
      state: {}
    };

    const results = [];

    // Execute steps with shared context
    for (const step of workflow.steps) {
      const result = await this.executeStep(step, sharedContext, context);
      
      // Update shared context
      sharedContext.messages.push({
        from: step.agent,
        content: result
      });
      
      results.push({
        step: step.name,
        success: true,
        output: result
      });
    }

    return {
      success: true,
      executionId,
      workflowId: workflow.id,
      results,
      metadata: { sharedContext }
    };
  }

  /**
   * Execute a single workflow step
   */
  private async executeStep(
    step: WorkflowStep,
    input: any,
    context?: ExecutionContext
  ): Promise<any> {
    this.logger.info(`Executing step: ${step.name}`);
    
    // Check conditions
    if (step.conditions && !this.evaluateConditions(step.conditions, input)) {
      this.logger.info(`Step ${step.name} skipped due to conditions`);
      return { skipped: true };
    }

    // Simulate step execution with timeout
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Step ${step.name} timed out`));
      }, step.timeout || 30000);

      // Simulate async operation
      setTimeout(() => {
        clearTimeout(timeout);
        
        // Simulate different types of operations
        if (step.agent && context?.agentRegistry) {
          // Agent-based execution
          resolve({
            agent: step.agent,
            action: step.action,
            params: step.params,
            input,
            result: `Executed ${step.action} by ${step.agent}`
          });
        } else if (step.action && context?.mcpGateway) {
          // MCP tool execution
          resolve({
            tool: step.action,
            params: step.params,
            input,
            result: `Executed MCP tool ${step.action}`
          });
        } else {
          // Generic execution
          resolve({
            step: step.name,
            input,
            output: `Step ${step.name} completed`
          });
        }
      }, Math.random() * 2000); // Random delay up to 2 seconds
    });
  }

  /**
   * Evaluate step conditions
   */
  private evaluateConditions(conditions: any, input: any): boolean {
    // Simple condition evaluation
    // In a real implementation, this would be more sophisticated
    return true;
  }

  /**
   * Get execution history
   */
  getHistory(limit: number = 100): ExecutionResult[] {
    const history = Array.from(this.executions.values())
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, limit);
    
    return history;
  }

  /**
   * Clean up old executions
   */
  private cleanupOldExecutions(): void {
    const oneHourAgo = Date.now() - 3600000;
    let cleaned = 0;
    
    for (const [id, execution] of this.executions.entries()) {
      if ((execution.duration || 0) < oneHourAgo) {
        this.executions.delete(id);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      this.logger.info(`Cleaned up ${cleaned} old executions`);
    }
  }

  /**
   * Get engine statistics
   */
  getStats(): any {
    return {
      workflows: this.workflows.size,
      executions: this.executions.size,
      activeExecutions: this.activeExecutions,
      maxConcurrent: this.config.maxConcurrent
    };
  }

  /**
   * Shutdown the engine
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Workflow Engine...');
    
    // Wait for active executions to complete
    while (this.activeExecutions > 0) {
      this.logger.info(`Waiting for ${this.activeExecutions} active executions...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    this.workflows.clear();
    this.executions.clear();
    this.removeAllListeners();
    
    this.logger.info('Workflow Engine shutdown complete');
  }
}