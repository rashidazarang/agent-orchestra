# Agent Orchestra

> Multi-Protocol Orchestration Framework for Enterprise Integration

[![Version](https://img.shields.io/badge/Version-2.0.0-brightgreen)](https://github.com/rashidazarang/agent-orchestra)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MCP Compatible](https://img.shields.io/badge/MCP-Native-blue)](https://modelcontextprotocol.io/)
[![Protocols](https://img.shields.io/badge/Protocols-6-orange)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)

## What It Does

Agent Orchestra connects and orchestrates systems across different protocols - from legacy SOAP services to modern MCP servers - in a single unified framework.

### Key Capabilities

- **Multi-Protocol**: Connect MCP, REST, SOAP, GraphQL, WebSocket, and Lambda in one place
- **Domain Templates**: Pre-built templates for specific industries (property management included)
- **Cross-Protocol Workflows**: Chain operations across different API types
- **Production Ready**: Built-in monitoring, error handling, and scaling

## 🎯 Use Cases

**Problem**: Enterprises use dozens of systems with different protocols:
- Legacy SOAP APIs (PropertyWare, SAP)
- Modern REST APIs (Stripe, Twilio)
- MCP Servers (Airtable, Supabase)
- Real-time WebSockets (Chat, IoT)
- Serverless Functions (AWS Lambda)

**Solution**: Agent Orchestra unifies them in one framework.

## 🏗️ Architecture

```mermaid
graph TB
    subgraph "Applications"
        APP1[Claude Code]
        APP2[Custom Apps]
        APP3[PropSync]
    end
    
    subgraph "Agent Orchestra v2.0"
        CORE[Orchestration Core]
        
        subgraph "Protocol Bridges"
            MCP[MCP Bridge<br/>with MCP Orchestrator]
            REST[REST Bridge]
            SOAP[SOAP Bridge]
            GQL[GraphQL Bridge]
            WS[WebSocket Bridge]
            LAMBDA[Lambda Bridge]
        end
        
        subgraph "Domain Plugins"
            PM[Property Management]
            HC[Healthcare]
            FIN[Finance]
        end
    end
    
    subgraph "External Systems"
        subgraph "MCP Servers"
            AIR[Airtable MCP]
            SUPA[Supabase MCP]
        end
        
        subgraph "APIs"
            PW[PropertyWare SOAP]
            SF[ServiceFusion REST]
            STRIPE[Stripe REST]
        end
        
        subgraph "Real-time"
            SLACK[Slack WebSocket]
            IOT[IoT Streams]
        end
        
        subgraph "Serverless"
            AWS[AWS Lambda]
            SYNC[GreenLight Sync]
        end
    end
    
    APP1 --> CORE
    APP2 --> CORE
    APP3 --> CORE
    
    CORE --> MCP
    CORE --> REST
    CORE --> SOAP
    CORE --> GQL
    CORE --> WS
    CORE --> LAMBDA
    
    MCP --> AIR
    MCP --> SUPA
    REST --> SF
    REST --> STRIPE
    SOAP --> PW
    WS --> SLACK
    WS --> IOT
    LAMBDA --> AWS
    LAMBDA --> SYNC
    
    PM --> CORE
    HC --> CORE
    FIN --> CORE
    
    style CORE fill:#e1f5fe
    style MCP fill:#fff3e0
    style PM fill:#f3e5f5
```

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/rashidazarang/agent-orchestra.git
cd agent-orchestra

# Install dependencies
npm install

# Build
npm run build
```

### Basic Usage

```typescript
import { createOrchestraV2 } from '@agent-orchestra/core';

// Create orchestra with multiple protocols
const orchestra = await createOrchestraV2({
  protocols: {
    mcp: true,      // MCP servers (Airtable, Supabase, etc.)
    rest: true,     // REST APIs
    soap: true,     // SOAP/XML services
    graphql: true,  // GraphQL endpoints
    websocket: true,// Real-time connections
    lambda: true    // Serverless functions
  }
});

// Initialize
await orchestra.initialize();

// Execute across any protocol!
await orchestra.execute('mcp', 'airtable.list_records', { table: 'Projects' });
await orchestra.execute('rest', 'stripe.get./v1/customers', { limit: 10 });
await orchestra.execute('soap', 'propertyware.GetPortfolios', { ... });
await orchestra.execute('lambda', 'syncData', { source: 'PW', dest: 'SF' });
```

## 💡 Features

### 1. Protocol Bridges

```typescript
// Add any MCP server
await orchestra.addMCPServer({
  name: 'airtable',
  package: '@rashidazarang/airtable-mcp'
});

// Add REST endpoint
orchestra.addRESTEndpoint({
  name: 'stripe',
  baseURL: 'https://api.stripe.com',
  auth: { type: 'bearer', credentials: { token: process.env.STRIPE_KEY } }
});

// Add SOAP service
orchestra.addSOAPService({
  name: 'propertyware',
  wsdl: 'https://api.propertyware.com/wsdl',
  auth: { type: 'oauth2', ... }
});

// Add Lambda function
orchestra.addLambdaFunction({
  name: 'greenlight-sync',
  handler: async (event) => { /* Your sync logic */ }
});
```

### 2. Domain System

Build vertical-specific solutions with the domain plugin system:

```typescript
import { PropertyManagementDomain } from '@agent-orchestra/domains';

// Register a domain
orchestra.registerDomain(new PropertyManagementDomain());

// Use domain-specific workflows
await orchestra.executeWorkflow('emergency-maintenance', {
  workOrderId: 'WO-123',
  priority: 'urgent'
});

await orchestra.executeWorkflow('monthly-reconciliation', {
  portfolio: 'Anderson',
  month: '2024-01'
});
```

### 3. Cross-Protocol Workflows

```typescript
// Define workflows that span multiple protocols
const workflow = {
  name: 'data-sync',
  steps: [
    { protocol: 'soap', operation: 'propertyware.GetWorkOrders' },
    { protocol: 'lambda', operation: 'transform-data' },
    { protocol: 'rest', operation: 'servicefusion.createJobs' },
    { protocol: 'mcp', operation: 'airtable.update_records' },
    { protocol: 'websocket', operation: 'notify-clients' }
  ]
};

await orchestra.executeWorkflow(workflow);
```

### 4. Integrated MCP Orchestrator

Our MCP Orchestrator is now built-in as a module:

```typescript
// All MCP servers managed through one interface
const mcpTools = await orchestra.listMCPTools();
// Returns tools from ALL connected MCP servers

// Smart routing across MCP servers
await orchestra.execute('mcp', 'sync_databases', {
  source: 'airtable',
  destination: 'supabase'
});
```

## 🏢 Domain Examples

### Property Management (PropSync Template)

```typescript
// Create PropSync-ready orchestra
const propSync = await createPropSyncOrchestra();

// Pre-configured with:
// - PropertyWare (SOAP + MCP)
// - ServiceFusion (REST + MCP)
// - GreenLight Sync (Lambda)
// - Supabase (REST + MCP)

// Execute property management workflows
await propSync.executeWorkflow('emergency-maintenance');
await propSync.executeWorkflow('tenant-move-in');
await propSync.executeWorkflow('monthly-reconciliation');
```

## 📦 What's Included

### Core Modules
- **Orchestration Engine** - Core workflow execution
- **Protocol Bridges** - Connect to any API type
- **Domain System** - Build vertical solutions
- **Agent Registry** - Manage agents across protocols
- **Workflow Engine** - Complex workflow patterns
- **Observability** - Monitoring and logging

### Protocol Support
| Protocol | Use Cases | Status |
|----------|-----------|---------|
| MCP | AI tools, modern integrations | ✅ Integrated |
| REST | Most modern APIs | ✅ Ready |
| SOAP | Legacy enterprise systems | ✅ Ready |
| GraphQL | Modern query APIs | ✅ Ready |
| WebSocket | Real-time, streaming | ✅ Ready |
| Lambda | Serverless, custom logic | ✅ Ready |

### Included Domains
- **Property Management** - Complete template for PropSync
- More domains coming soon!

## 🔧 Advanced Configuration

### Multi-Protocol Setup

```yaml
# orchestra.config.yml
protocols:
  mcp:
    servers:
      - name: airtable
        package: "@rashidazarang/airtable-mcp"
      - name: supabase
        package: "@supabase/mcp-server"
  
  rest:
    endpoints:
      - name: stripe
        baseURL: https://api.stripe.com
      - name: twilio
        baseURL: https://api.twilio.com
  
  soap:
    services:
      - name: propertyware
        wsdl: https://api.propertyware.com/wsdl
  
  lambda:
    functions:
      - name: sync-engine
        runtime: nodejs18
        handler: sync.handler

domains:
  - property-management
  - healthcare
  - finance
```

## 🤝 Building Your Own Domain

```typescript
import { Domain } from '@agent-orchestra/core';

export class HealthcareDomain implements Domain {
  name = 'healthcare';
  version = '1.0.0';
  
  getWorkflows() {
    return [
      {
        id: 'patient-admission',
        steps: [
          { protocol: 'rest', operation: 'epic.createPatient' },
          { protocol: 'mcp', operation: 'insurance.verify' },
          { protocol: 'soap', operation: 'legacy.updateRecords' }
        ]
      }
    ];
  }
}

// Register your domain
orchestra.registerDomain(new HealthcareDomain());
```

## 📊 Supported Protocols

| Protocol | Use Cases | Status |
|----------|-----------|--------|
| MCP | AI tools, modern integrations | ✅ Native Support |
| REST | Most modern APIs | ✅ Ready |
| SOAP | Legacy enterprise systems | ✅ Ready |
| GraphQL | Modern query APIs | ✅ Ready |
| WebSocket | Real-time, streaming | ✅ Ready |
| Lambda | Serverless, custom logic | ✅ Ready |

## 🛠️ Development

### Testing
```bash
npm test
```

### Building
```bash
npm run build
```

### Running Examples
```bash
# Basic orchestration
npm run example:basic

# Property management
npm run example:propsync

# Multi-protocol
npm run example:multi-protocol
```

## 📚 Documentation

- [Getting Started](docs/getting-started.md)
- [Architecture Overview](docs/architecture.md)
- [Protocol Bridges](docs/protocols.md)
- [Domain System](docs/domains.md)
- [API Reference](docs/api-reference.md)
- [Migration from v0.1.0](docs/migration.md)

## 🎯 Use Cases

### For Enterprises
- **System Integration**: Unite legacy SOAP with modern REST/GraphQL
- **Process Automation**: Orchestrate workflows across all systems
- **Data Synchronization**: Keep multiple systems in sync

### For Developers
- **Multi-Protocol APIs**: Build APIs that aggregate multiple sources
- **Workflow Automation**: Create complex cross-system workflows
- **Domain Solutions**: Build vertical-specific platforms

### For Specific Industries
- **Property Management**: PropSync template ready to use
- **Healthcare**: Connect EHR, billing, insurance systems
- **Finance**: Integrate banking, payment, accounting systems

## 🗺️ Roadmap

### 🚧 In Progress
- [ ] Additional domains (Healthcare, Finance)
- [ ] Visual workflow designer
- [ ] Cloud deployment templates
- [ ] SDK for domain creation

### 📋 Planned
- [ ] AI-powered workflow generation
- [ ] Automatic protocol detection
- [ ] Distributed execution
- [ ] Enterprise authentication (SSO, SAML)

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### How to Contribute
1. Fork the repository
2. Create your feature branch
3. Add your protocol bridge or domain
4. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

- Built on [Model Context Protocol](https://modelcontextprotocol.io/) by Anthropic
- Inspired by enterprise integration patterns
- Community contributions and feedback

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/rashidazarang/agent-orchestra/issues)
- **Discussions**: [GitHub Discussions](https://github.com/rashidazarang/agent-orchestra/discussions)
- **Twitter**: [@agentorchestra](https://twitter.com/agentorchestra)

## 🏆 Why Agent Orchestra?

1. **Universal Compatibility**: Works with any API or protocol
2. **Domain Flexibility**: Build for any industry vertical
3. **Production Ready**: Enterprise-grade architecture
4. **Open Source**: MIT licensed, community-driven
5. **Extensible**: Add new protocols and domains easily

---

**MIT Licensed** | Built by Rashid Azarang