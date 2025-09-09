# Building Domain Solutions with Agent Orchestra

## Quick Start Guide

This guide shows you how to build industry-specific solutions using Agent Orchestra as your orchestration engine.

## What You're Building

Think of it this way:
- **Agent Orchestra** = The engine (like Node.js)
- **Your Domain Solution** = The application (like PropSync)

## Step-by-Step Implementation

### Step 1: Set Up Your Project

```bash
# Create your domain solution (example: PropSync)
mkdir propsync
cd propsync

# Initialize
npm init -y
git init

# Install Agent Orchestra
npm install @agent-orchestra/core
```

### Step 2: Define Your Structure

```
propsync/
├── src/
│   ├── index.ts           # Main entry point
│   ├── PropSync.ts        # Core class
│   ├── integrations/      # Your specific integrations
│   ├── workflows/         # Domain workflows
│   └── api/              # Your API layer
├── package.json
└── README.md
```

### Step 3: Create Your Core Class

```typescript
// src/PropSync.ts
import { createOrchestraV2, OrchestraV2 } from '@agent-orchestra/core';

export class PropSync {
  private orchestra: OrchestraV2;
  private config: PropSyncConfig;

  constructor(config: PropSyncConfig) {
    this.config = config;
  }

  async initialize() {
    // Step 1: Initialize Agent Orchestra with needed protocols
    this.orchestra = await createOrchestraV2({
      protocols: {
        mcp: true,      // For modern integrations
        rest: true,     // For REST APIs
        soap: true,     // For PropertyWare
        lambda: true    // For custom functions
      }
    });

    // Step 2: Register your integrations
    await this.registerIntegrations();

    // Step 3: Set up your workflows
    await this.setupWorkflows();

    console.log('PropSync initialized successfully');
  }

  private async registerIntegrations() {
    // Add PropertyWare SOAP service
    await this.orchestra.addSOAPService({
      name: 'propertyware',
      wsdl: this.config.propertyware.wsdl,
      auth: {
        type: 'oauth2',
        credentials: this.config.propertyware.credentials
      }
    });

    // Add ServiceFusion REST API
    await this.orchestra.addRESTEndpoint({
      name: 'servicefusion',
      baseURL: 'https://api.servicefusion.com',
      auth: {
        type: 'bearer',
        credentials: { token: this.config.servicefusion.token }
      }
    });

    // Add your MCP servers
    await this.orchestra.addMCPServer({
      name: 'airtable',
      package: '@rashidazarang/airtable-mcp'
    });
  }

  private async setupWorkflows() {
    // Define domain-specific workflows
    await this.orchestra.registerWorkflow({
      id: 'emergency-maintenance',
      name: 'Emergency Maintenance Response',
      steps: [
        {
          name: 'fetch-work-order',
          protocol: 'soap',
          operation: 'propertyware.GetWorkOrder',
          input: '{{ trigger.workOrderId }}'
        },
        {
          name: 'assess-priority',
          protocol: 'lambda',
          operation: 'assessUrgency',
          input: '{{ steps.fetch-work-order.output }}'
        },
        {
          name: 'dispatch-vendor',
          protocol: 'rest',
          operation: 'servicefusion.post./jobs',
          input: {
            priority: '{{ steps.assess-priority.urgency }}',
            property: '{{ steps.fetch-work-order.property }}',
            issue: '{{ steps.fetch-work-order.description }}'
          }
        },
        {
          name: 'log-to-airtable',
          protocol: 'mcp',
          operation: 'airtable.create_record',
          input: {
            table: 'EmergencyLog',
            fields: {
              workOrder: '{{ trigger.workOrderId }}',
              vendor: '{{ steps.dispatch-vendor.vendorId }}',
              timestamp: '{{ now }}'
            }
          }
        }
      ]
    });
  }

  // Domain-specific methods
  async handleEmergencyMaintenance(workOrderId: string) {
    return await this.orchestra.executeWorkflow('emergency-maintenance', {
      workOrderId
    });
  }

  async syncTenantData() {
    // Your business logic here
    const tenants = await this.orchestra.execute(
      'soap', 
      'propertyware.GetTenants'
    );
    
    // Process and sync
    for (const tenant of tenants) {
      await this.orchestra.execute('mcp', 'airtable.update_record', {
        table: 'Tenants',
        id: tenant.id,
        fields: tenant
      });
    }
  }
}
```

### Step 4: Create Your API Layer

```typescript
// src/api/server.ts
import express from 'express';
import { PropSync } from '../PropSync';

const app = express();
const propSync = new PropSync(config);

app.post('/api/emergency', async (req, res) => {
  const result = await propSync.handleEmergencyMaintenance(
    req.body.workOrderId
  );
  res.json(result);
});

app.post('/api/sync/tenants', async (req, res) => {
  await propSync.syncTenantData();
  res.json({ success: true });
});

app.listen(3000, () => {
  console.log('PropSync API running on port 3000');
});
```

### Step 5: Package Configuration

```json
// package.json
{
  "name": "@propsync/core",
  "version": "1.0.0",
  "description": "Property Management Orchestration Platform",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx watch src/index.ts"
  },
  "dependencies": {
    "@agent-orchestra/core": "^2.0.0",
    "express": "^4.18.0",
    "propertyware-sdk": "^1.0.0",
    "servicefusion-api": "^2.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "@types/express": "^4.17.0"
  }
}
```

## Real-World Examples

### Example 1: Healthcare Solution (HealthSync)

```typescript
class HealthSync {
  private orchestra: OrchestraV2;

  async initialize() {
    this.orchestra = await createOrchestraV2({
      protocols: {
        mcp: true,      // For modern EHR
        rest: true,     // For insurance APIs
        soap: true,     // For legacy systems
        graphql: true   // For modern queries
      }
    });

    // Healthcare-specific integrations
    await this.orchestra.addRESTEndpoint({
      name: 'epic',
      baseURL: 'https://api.epic.com',
      auth: { type: 'oauth2', credentials: epicCreds }
    });

    await this.orchestra.addSOAPService({
      name: 'legacy-his',
      wsdl: 'https://hospital.com/his?wsdl'
    });
  }

  async admitPatient(patientData: PatientData) {
    return await this.orchestra.executeWorkflow('patient-admission', {
      steps: [
        { protocol: 'rest', operation: 'epic.createPatient' },
        { protocol: 'rest', operation: 'insurance.verify' },
        { protocol: 'soap', operation: 'legacy-his.updateRecords' },
        { protocol: 'mcp', operation: 'notifications.send' }
      ]
    });
  }
}
```

### Example 2: Finance Solution (FinanceFlow)

```typescript
class FinanceFlow {
  private orchestra: OrchestraV2;

  async initialize() {
    this.orchestra = await createOrchestraV2({
      protocols: {
        rest: true,     // For banking APIs
        graphql: true,  // For analytics
        websocket: true,// For real-time rates
        lambda: true    // For calculations
      }
    });

    // Finance-specific integrations
    await this.orchestra.addRESTEndpoint({
      name: 'stripe',
      baseURL: 'https://api.stripe.com'
    });

    await this.orchestra.addWebSocketConnection({
      name: 'market-data',
      url: 'wss://market-feed.com'
    });
  }

  async processPayment(payment: Payment) {
    return await this.orchestra.executeWorkflow('payment-processing', {
      steps: [
        { protocol: 'rest', operation: 'stripe.createCharge' },
        { protocol: 'lambda', operation: 'calculateFees' },
        { protocol: 'rest', operation: 'accounting.record' },
        { protocol: 'websocket', operation: 'notify-realtime' }
      ]
    });
  }
}
```

## Deployment Options

### Option 1: Standalone Service

```dockerfile
# Dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

### Option 2: Serverless Functions

```typescript
// serverless.ts
import { PropSync } from './PropSync';

const propSync = new PropSync(config);

export const handler = async (event) => {
  await propSync.initialize();
  return await propSync.handleEmergencyMaintenance(event.workOrderId);
};
```

### Option 3: Microservice in Kubernetes

```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: propsync
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: propsync
        image: propsync:latest
        env:
        - name: ORCHESTRA_CONFIG
          valueFrom:
            configMapKeyRef:
              name: orchestra-config
```

## Testing Your Domain Solution

```typescript
// tests/PropSync.test.ts
import { PropSync } from '../src/PropSync';

describe('PropSync', () => {
  let propSync: PropSync;

  beforeAll(async () => {
    propSync = new PropSync(testConfig);
    await propSync.initialize();
  });

  test('should handle emergency maintenance', async () => {
    const result = await propSync.handleEmergencyMaintenance('WO-123');
    
    expect(result.success).toBe(true);
    expect(result.vendorDispatched).toBe(true);
    expect(result.tenantNotified).toBe(true);
  });

  test('should sync tenant data', async () => {
    await propSync.syncTenantData();
    
    // Verify sync completed
    const tenants = await propSync.getTenants();
    expect(tenants.length).toBeGreaterThan(0);
  });
});
```

## Common Patterns

### Pattern 1: Error Handling

```typescript
class PropSync {
  async handleEmergencyMaintenance(workOrderId: string) {
    try {
      return await this.orchestra.executeWorkflow('emergency-maintenance', {
        workOrderId
      });
    } catch (error) {
      // Domain-specific error handling
      if (error.code === 'VENDOR_UNAVAILABLE') {
        return await this.escalateToManager(workOrderId);
      }
      throw new PropSyncError('Maintenance dispatch failed', error);
    }
  }
}
```

### Pattern 2: Caching

```typescript
class PropSync {
  private cache = new Map();

  async getProperty(propertyId: string) {
    if (this.cache.has(propertyId)) {
      return this.cache.get(propertyId);
    }

    const property = await this.orchestra.execute(
      'soap',
      'propertyware.GetProperty',
      { propertyId }
    );

    this.cache.set(propertyId, property);
    return property;
  }
}
```

### Pattern 3: Batch Processing

```typescript
class PropSync {
  async batchSyncProperties(propertyIds: string[]) {
    const chunks = this.chunkArray(propertyIds, 10);
    
    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(id => this.syncProperty(id))
      );
      
      // Rate limiting
      await this.delay(1000);
    }
  }
}
```

## Monitoring & Observability

```typescript
class PropSync {
  private metrics = {
    workflowsExecuted: 0,
    errors: 0,
    avgResponseTime: 0
  };

  async handleEmergencyMaintenance(workOrderId: string) {
    const start = Date.now();
    
    try {
      const result = await this.orchestra.executeWorkflow(
        'emergency-maintenance',
        { workOrderId }
      );
      
      this.metrics.workflowsExecuted++;
      this.updateAvgResponseTime(Date.now() - start);
      
      return result;
    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }

  getMetrics() {
    return this.metrics;
  }
}
```

## Security Considerations

```typescript
class PropSync {
  constructor(config: PropSyncConfig) {
    // Validate configuration
    this.validateConfig(config);
    
    // Encrypt sensitive data
    this.config = this.encryptSensitiveData(config);
    
    // Set up audit logging
    this.setupAuditLog();
  }

  private validateConfig(config: PropSyncConfig) {
    if (!config.propertyware?.credentials) {
      throw new Error('PropertyWare credentials required');
    }
    
    if (!this.isValidApiKey(config.servicefusion?.token)) {
      throw new Error('Invalid ServiceFusion token');
    }
  }
}
```

## Next Steps

1. **Start Small**: Begin with one or two integrations
2. **Add Gradually**: Expand your workflows over time
3. **Monitor Performance**: Track metrics and optimize
4. **Share Knowledge**: Contribute patterns back to the community
5. **Stay Updated**: Keep Agent Orchestra dependency current

## Getting Help

- **Agent Orchestra Issues**: [GitHub Issues](https://github.com/rashidazarang/agent-orchestra/issues)
- **Documentation**: [Agent Orchestra Docs](https://github.com/rashidazarang/agent-orchestra)
- **Community**: [Discussions](https://github.com/rashidazarang/agent-orchestra/discussions)

---

Remember: Agent Orchestra handles the orchestration complexity, so you can focus on your domain logic!