/**
 * Logger Utility
 */

export class Logger {
  constructor(private context: string) {}

  debug(message: string, ...args: any[]): void {
    console.log(`[DEBUG] [${this.context}] ${message}`, ...args);
  }

  info(message: string, ...args: any[]): void {
    console.log(`[INFO] [${this.context}] ${message}`, ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(`[WARN] [${this.context}] ${message}`, ...args);
  }

  error(message: string, error?: any): void {
    console.error(`[ERROR] [${this.context}] ${message}`, error);
  }
}