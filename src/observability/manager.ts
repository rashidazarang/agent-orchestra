/**
 * Observability Manager
 * 
 * Handles traces, metrics, and logs
 */

import { Span, Metric, LogEntry } from '../types';
import { Logger } from '../utils/logger';

export class ObservabilityManager {
  private logger: Logger;
  private spans: Map<string, Span> = new Map();
  private metrics: Metric[] = [];
  private logs: LogEntry[] = [];
  private config: any;

  constructor(config: any) {
    this.config = config;
    this.logger = new Logger('Observability');
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing Observability Manager...');
    
    // Setup exporters based on config
    if (this.config.traces.enabled) {
      this.setupTraceExporter();
    }
    
    if (this.config.metrics.enabled) {
      this.setupMetricsExporter();
    }
    
    this.logger.info('Observability Manager initialized');
  }

  startSpan(name: string, attributes: Record<string, any> = {}): Span {
    const span: Span = {
      name,
      attributes,
      startTime: Date.now(),
      end: () => {
        span.endTime = Date.now();
        this.spans.set(`${name}-${span.startTime}`, span);
      }
    };
    
    return span;
  }

  recordMetric(name: string, value: number, labels: Record<string, string> = {}): void {
    const metric: Metric = {
      name,
      value,
      labels,
      timestamp: Date.now()
    };
    
    this.metrics.push(metric);
    
    if (this.config.metrics.exporter === 'console') {
      this.logger.info(`Metric: ${name} = ${value}`, labels);
    }
  }

  log(level: LogEntry['level'], message: string, context?: any): void {
    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date().toISOString()
    };
    
    this.logs.push(entry);
    
    if (this.config.logs.enabled) {
      this.logger[level](message, context);
    }
  }

  getMetrics(): any {
    const grouped: Record<string, any> = {};
    
    for (const metric of this.metrics) {
      if (!grouped[metric.name]) {
        grouped[metric.name] = {
          count: 0,
          sum: 0,
          min: Infinity,
          max: -Infinity,
          values: []
        };
      }
      
      const group = grouped[metric.name];
      group.count++;
      group.sum += metric.value;
      group.min = Math.min(group.min, metric.value);
      group.max = Math.max(group.max, metric.value);
      group.values.push(metric.value);
    }
    
    // Calculate averages
    for (const name in grouped) {
      grouped[name].average = grouped[name].sum / grouped[name].count;
    }
    
    return grouped;
  }

  private setupTraceExporter(): void {
    // Setup trace exporter based on config
    this.logger.info(`Setting up trace exporter: ${this.config.traces.exporter}`);
  }

  private setupMetricsExporter(): void {
    // Setup metrics exporter based on config
    this.logger.info(`Setting up metrics exporter: ${this.config.metrics.exporter}`);
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Observability Manager...');
    
    // Export any remaining data
    this.spans.clear();
    this.metrics = [];
    this.logs = [];
    
    this.logger.info('Observability Manager shutdown complete');
  }
}