/**
 * Simple Workflow Example
 * 
 * Demonstrates basic usage of Agent Orchestra
 */

import { createOrchestra } from '../src';

async function main() {
  // Create orchestra instance
  const orchestra = await createOrchestra({
    mcp: {
      servers: [
        {
          name: 'airtable',
          package: '@rashidazarang/airtable-mcp',
          version: '3.2.4',
          config: {
            token: process.env.AIRTABLE_TOKEN,
            baseId: process.env.AIRTABLE_BASE_ID
          }
        }
      ]
    }
  });

  // Initialize
  await orchestra.initialize();

  // Create a simple sequential workflow
  const workflow = orchestra.createWorkflow({
    name: 'data-processing',
    pattern: 'sequential',
    description: 'Fetch data from Airtable, analyze it, and store results'
  });

  // Add steps
  workflow
    .addStep('fetch-data', {
      agent: 'airtable-agent',
      action: 'list_records',
      params: {
        table: 'Projects',
        view: 'Active Projects'
      }
    })
    .addStep('analyze', {
      agent: 'data-analyst',
      action: 'analyze_trends',
      input: '{{fetch-data.output}}'
    })
    .addStep('store-results', {
      agent: 'airtable-agent',
      action: 'create_record',
      params: {
        table: 'Analytics',
        fields: '{{analyze.output}}'
      }
    });

  // Execute workflow
  console.log('Starting workflow execution...');
  const result = await workflow.execute();
  
  if (result.success) {
    console.log('Workflow completed successfully!');
    console.log('Results:', result.results);
  } else {
    console.error('Workflow failed:', result.error);
  }

  // Get metrics
  const metrics = await orchestra.getMetrics();
  console.log('Execution metrics:', metrics);

  // Shutdown
  await orchestra.shutdown();
}

// Run the example
main().catch(console.error);