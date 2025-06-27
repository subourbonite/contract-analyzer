/**
 * Simple logging service implementation
 */

import { LoggingService } from './interfaces'

export class ConsoleLoggerService implements LoggingService {
  constructor(private component: string = 'App') {}

  debug(message: string, context?: Record<string, unknown>): void {
    if (import.meta.env.MODE === 'development') {
      console.debug(`[${this.component}] ${message}`, context || '')
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    console.info(`[${this.component}] ${message}`, context || '')
  }

  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(`[${this.component}] ${message}`, context || '')
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    console.error(`[${this.component}] ${message}`, error, context || '')
  }

  createChildLogger(component: string): LoggingService {
    return new ConsoleLoggerService(`${this.component}:${component}`)
  }
}
