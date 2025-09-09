/**
 * REST Bridge - Handles REST API integrations
 */

import { EventEmitter } from 'events';
import { ProtocolBridge } from '../index';
import { Logger } from '../../utils/logger';

interface RESTEndpoint {
  name: string;
  baseURL: string;
  headers?: Record<string, string>;
  auth?: {
    type: 'bearer' | 'basic' | 'apikey' | 'oauth2';
    credentials: any;
  };
}

export class RESTBridge extends EventEmitter implements ProtocolBridge {
  name = 'rest';
  private logger: Logger;
  private endpoints: Map<string, RESTEndpoint> = new Map();

  constructor() {
    super();
    this.logger = new Logger('RESTBridge');
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing REST Bridge...');
  }

  async execute(operation: string, params: any): Promise<any> {
    const [endpoint, method, path] = operation.split('.');
    const config = this.endpoints.get(endpoint);
    
    if (!config) {
      throw new Error(`REST endpoint ${endpoint} not configured`);
    }

    const url = `${config.baseURL}${path || ''}`;
    const headers = this.buildHeaders(config);

    this.logger.info(`REST ${method.toUpperCase()} ${url}`);

    try {
      const response = await fetch(url, {
        method: method.toUpperCase(),
        headers,
        body: params ? JSON.stringify(params) : undefined
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      this.logger.error(`REST operation failed: ${error.message}`);
      throw error;
    }
  }

  registerEndpoint(endpoint: RESTEndpoint): void {
    this.endpoints.set(endpoint.name, endpoint);
    this.logger.info(`Registered REST endpoint: ${endpoint.name}`);
  }

  private buildHeaders(config: RESTEndpoint): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...config.headers
    };

    if (config.auth) {
      switch (config.auth.type) {
        case 'bearer':
          headers['Authorization'] = `Bearer ${config.auth.credentials.token}`;
          break;
        case 'apikey':
          headers[config.auth.credentials.header || 'X-API-Key'] = config.auth.credentials.key;
          break;
        case 'basic':
          const encoded = Buffer.from(
            `${config.auth.credentials.username}:${config.auth.credentials.password}`
          ).toString('base64');
          headers['Authorization'] = `Basic ${encoded}`;
          break;
      }
    }

    return headers;
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down REST Bridge...');
    this.endpoints.clear();
  }
}