/**
 * Infrastructure Adapter: Console Logger
 * Implements ILogger interface for console-based logging
 *
 * Following Dependency Inversion Principle:
 * - Implements domain-defined interface
 * - Can be easily swapped for other logging implementations
 * - Infrastructure concern separated from business logic
 */

import { ILogger } from '../../application/use-cases/ProcessContractFilesUseCase'

export class ConsoleLogger implements ILogger {

  info(message: string, metadata?: any): void {
    const timestamp = new Date().toISOString()
    console.log(`[INFO] ${timestamp} - ${message}`)

    if (metadata) {
      console.log('  Metadata:', JSON.stringify(metadata, null, 2))
    }
  }

  error(message: string, error?: Error, metadata?: any): void {
    const timestamp = new Date().toISOString()
    console.error(`[ERROR] ${timestamp} - ${message}`)

    if (error) {
      console.error('  Error Details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      })
    }

    if (metadata) {
      console.error('  Metadata:', JSON.stringify(metadata, null, 2))
    }
  }

  warn(message: string, metadata?: any): void {
    const timestamp = new Date().toISOString()
    console.warn(`[WARN] ${timestamp} - ${message}`)

    if (metadata) {
      console.warn('  Metadata:', JSON.stringify(metadata, null, 2))
    }
  }
}

/**
 * Enhanced logger with different log levels
 */
export class EnhancedConsoleLogger extends ConsoleLogger {
  constructor(private logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info') {
    super()
  }

  debug(message: string, metadata?: any): void {
    if (this.shouldLog('debug')) {
      const timestamp = new Date().toISOString()
      console.debug(`[DEBUG] ${timestamp} - ${message}`)

      if (metadata) {
        console.debug('  Metadata:', JSON.stringify(metadata, null, 2))
      }
    }
  }

  warn(message: string, metadata?: any): void {
    if (this.shouldLog('warn')) {
      const timestamp = new Date().toISOString()
      console.warn(`[WARN] ${timestamp} - ${message}`)

      if (metadata) {
        console.warn('  Metadata:', JSON.stringify(metadata, null, 2))
      }
    }
  }

  private shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
    const levels = ['debug', 'info', 'warn', 'error']
    const currentLevelIndex = levels.indexOf(this.logLevel)
    const messageLevelIndex = levels.indexOf(level)

    return messageLevelIndex >= currentLevelIndex
  }
}
