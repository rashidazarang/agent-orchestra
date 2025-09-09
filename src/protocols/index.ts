/**
 * Protocol Bridges for Agent Orchestra
 * 
 * Supports multiple protocols beyond just MCP
 */

export { MCPBridge } from './mcp/MCPBridge';
export { RESTBridge } from './rest/RESTBridge';
export { SOAPBridge } from './soap/SOAPBridge';
export { GraphQLBridge } from './graphql/GraphQLBridge';
export { WebSocketBridge } from './websocket/WebSocketBridge';
export { LambdaBridge } from './lambda/LambdaBridge';

export interface ProtocolBridge {
  name: string;
  initialize(): Promise<void>;
  execute(operation: string, params: any): Promise<any>;
  shutdown(): Promise<void>;
}