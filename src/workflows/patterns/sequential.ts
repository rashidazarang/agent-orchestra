/**
 * Sequential Workflow Pattern
 * 
 * Executes steps one after another in sequence
 */

import { Workflow, WorkflowStep } from '../../types';

export class SequentialWorkflow {
  constructor(private workflow: Workflow) {}

  async execute(context: any): Promise<any> {
    const results = [];
    let previousOutput = null;

    for (const step of this.workflow.steps) {
      const input = this.resolveInput(step, previousOutput, context);
      const output = await this.executeStep(step, input, context);
      
      results.push({
        step: step.name,
        output
      });
      
      previousOutput = output;
    }

    return results;
  }

  private resolveInput(step: WorkflowStep, previousOutput: any, context: any): any {
    if (step.input && typeof step.input === 'string') {
      if (step.input.startsWith('{{') && step.input.endsWith('}}')) {
        const path = step.input.slice(2, -2);
        
        if (path === 'previous') {
          return previousOutput;
        }
        
        // Resolve from context
        return this.getValueFromPath(context, path);
      }
    }
    
    return step.input || previousOutput;
  }

  private getValueFromPath(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private async executeStep(step: WorkflowStep, input: any, context: any): Promise<any> {
    // Step execution logic
    return {
      step: step.name,
      input,
      timestamp: new Date().toISOString()
    };
  }
}