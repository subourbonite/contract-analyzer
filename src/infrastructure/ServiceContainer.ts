/**
 * Infrastructure: Service Container
 * Manages dependency injection and service creation
 *
 * Following Dependency Injection and Factory patterns:
 * - Creates and configures all services
 * - Manages dependencies between layers
 * - Provides clean API for service access
 */

import { ProcessContractFilesUseCase, ProcessContractFilesUseCaseEnhanced } from '../application/use-cases/ProcessContractFilesUseCase'
import { DeleteContractUseCase } from '../application/use-cases/DeleteContractUseCase'
import { ConsoleLogger, EnhancedConsoleLogger } from './adapters/ConsoleLogger'
import { TextExtractorFactory } from './adapters/TextractExtractor'
import { ContractAnalyzerFactory } from './adapters/BedrockAnalyzer'
import { FileStorageFactory } from './adapters/S3FileStorage'

export type Environment = 'production' | 'development' | 'test'

export interface ServiceContainerConfig {
  environment: Environment
  logLevel?: 'debug' | 'info' | 'warn' | 'error'
}

/**
 * Simple service container for dependency injection
 */
export class ServiceContainer {
  private static instance: ServiceContainer
  private config: ServiceContainerConfig

  private constructor(config: ServiceContainerConfig) {
    this.config = config
  }

  /**
   * Get or create singleton instance
   */
  static getInstance(config?: ServiceContainerConfig): ServiceContainer {
    if (!this.instance) {
      this.instance = new ServiceContainer(config || { environment: 'production' })
    }
    return this.instance
  }

  /**
   * Create the main use case with all dependencies
   */
  createProcessContractFilesUseCase(): ProcessContractFilesUseCase {
    const logger = this.createLogger()
    const textExtractor = this.createTextExtractor()
    const contractAnalyzer = this.createContractAnalyzer()

    return new ProcessContractFilesUseCase(textExtractor, contractAnalyzer, logger)
  }

  /**
   * Create enhanced use case with detailed reporting
   */
  createProcessContractFilesUseCaseEnhanced(): ProcessContractFilesUseCaseEnhanced {
    const logger = this.createLogger()
    const textExtractor = this.createTextExtractor()
    const contractAnalyzer = this.createContractAnalyzer()

    return new ProcessContractFilesUseCaseEnhanced(textExtractor, contractAnalyzer, logger)
  }

  /**
   * Create delete contract use case with file storage
   */
  createDeleteContractUseCase(): DeleteContractUseCase {
    const logger = this.createLogger()
    const fileStorage = this.createFileStorage()

    return new DeleteContractUseCase(fileStorage, logger)
  }

  /**
   * Create logger based on configuration
   */
  private createLogger() {
    if (this.config.logLevel) {
      return new EnhancedConsoleLogger(this.config.logLevel)
    }
    return new ConsoleLogger()
  }

  /**
   * Create text extractor based on environment
   */
  private createTextExtractor() {
    return TextExtractorFactory.create(this.config.environment)
  }

  /**
   * Create contract analyzer based on environment
   */
  private createContractAnalyzer() {
    return ContractAnalyzerFactory.create(this.config.environment)
  }

  /**
   * Create file storage based on environment
   */
  private createFileStorage() {
    return FileStorageFactory.create(this.config.environment)
  }

  /**
   * Update configuration (useful for testing)
   */
  updateConfig(config: Partial<ServiceContainerConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get current configuration
   */
  getConfig(): ServiceContainerConfig {
    return { ...this.config }
  }
}

/**
 * Helper function to get configured use case quickly
 */
export function createContractProcessingUseCase(environment: Environment = 'production'): ProcessContractFilesUseCase {
  const container = ServiceContainer.getInstance({ environment })
  return container.createProcessContractFilesUseCase()
}

/**
 * Helper function to get enhanced use case quickly
 */
export function createEnhancedContractProcessingUseCase(environment: Environment = 'production'): ProcessContractFilesUseCaseEnhanced {
  const container = ServiceContainer.getInstance({ environment })
  return container.createProcessContractFilesUseCaseEnhanced()
}

/**
 * Helper function to get delete contract use case quickly
 */
export function createDeleteContractUseCase(environment: Environment = 'production'): DeleteContractUseCase {
  const container = ServiceContainer.getInstance({ environment })
  return container.createDeleteContractUseCase()
}
