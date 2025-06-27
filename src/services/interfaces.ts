/**
 * Service interfaces following Dependency Inversion Principle
 * These interfaces define contracts that can be implemented by different providers
 */

import { Result } from '../types/result'
import { ContractAnalyzerError } from '../types/errors'
import { ContractAnalysisResult } from '../types/contract'

// Text Extraction Service Interface
export interface TextExtractionService {
  extractText(file: File): Promise<Result<string, ContractAnalyzerError>>
  getSupportedFileTypes(): readonly string[]
  getMaxFileSize(): number
}

// Contract Analysis Service Interface
export interface ContractAnalysisService {
  analyzeContract(
    text: string,
    fileName: string
  ): Promise<Result<ContractAnalysisResult, ContractAnalyzerError>>
  getModelInfo(): {
    name: string
    version: string
    capabilities: string[]
  }
}

// File Storage Service Interface
export interface FileStorageService {
  uploadFile(file: File, key?: string): Promise<Result<string, ContractAnalyzerError>>
  deleteFile(key: string): Promise<Result<void, ContractAnalyzerError>>
  getFileUrl(key: string): Promise<Result<string, ContractAnalyzerError>>
  fileExists(key: string): Promise<Result<boolean, ContractAnalyzerError>>
}

// Authentication Service Interface
export interface AuthenticationService {
  getCurrentUser(): Promise<Result<AuthUser, ContractAnalyzerError>>
  getUserAttributes(): Promise<Result<Record<string, string>, ContractAnalyzerError>>
  signOut(): Promise<Result<void, ContractAnalyzerError>>
}

// User representation
export interface AuthUser {
  id: string
  username: string
  email?: string
  attributes?: Record<string, string>
}

// Health Check Service Interface
export interface HealthCheckService {
  checkServiceHealth(): Promise<Result<ServiceHealthStatus, ContractAnalyzerError>>
  checkDependencies(): Promise<Result<DependencyStatus[], ContractAnalyzerError>>
}

export interface ServiceHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: Date
  version: string
  dependencies: DependencyStatus[]
}

export interface DependencyStatus {
  name: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  responseTime?: number
  error?: string
}

// Configuration Service Interface
export interface ConfigurationService {
  getAWSConfig(): AWSConfiguration
  getProcessingConfig(): ProcessingConfiguration
  getUIConfig(): UIConfiguration
  validateConfiguration(): Result<void, ContractAnalyzerError>
}

export interface AWSConfiguration {
  region: string
  s3BucketName: string
  textractSettings: TextractSettings
  bedrockSettings: BedrockSettings
}

export interface TextractSettings {
  maxRetries: number
  pollIntervalMs: number
  timeoutMs: number
}

export interface BedrockSettings {
  modelId: string
  maxTokens: number
  temperature?: number
}

export interface ProcessingConfiguration {
  maxFileSize: number
  maxConcurrentProcessing: number
  supportedFileTypes: readonly string[]
  timeoutMs: number
}

export interface UIConfiguration {
  maxConcurrentUploads: number
  uploadTimeoutMs: number
  analysisTimeoutMs: number
  enableDebugMode: boolean
}

// Logging Service Interface
export interface LoggingService {
  debug(message: string, context?: Record<string, unknown>): void
  info(message: string, context?: Record<string, unknown>): void
  warn(message: string, context?: Record<string, unknown>): void
  error(message: string, error?: Error, context?: Record<string, unknown>): void
  createChildLogger(component: string): LoggingService
}

// Metrics Service Interface
export interface MetricsService {
  recordProcessingTime(operation: string, durationMs: number): void
  recordFileProcessed(fileType: string, sizeBytes: number): void
  recordError(errorType: string, errorCode?: string): void
  recordUserAction(action: string, userId?: string): void
  incrementCounter(metric: string, tags?: Record<string, string>): void
}

// Cache Service Interface
export interface CacheService<T> {
  get(key: string): Promise<Result<T | null, ContractAnalyzerError>>
  set(key: string, value: T, ttlSeconds?: number): Promise<Result<void, ContractAnalyzerError>>
  delete(key: string): Promise<Result<void, ContractAnalyzerError>>
  clear(): Promise<Result<void, ContractAnalyzerError>>
  has(key: string): Promise<Result<boolean, ContractAnalyzerError>>
}

// Validation Service Interface
export interface ValidationService {
  validateFile(file: File): Result<void, ContractAnalyzerError>
  validateFileType(mimeType: string): Result<void, ContractAnalyzerError>
  validateFileSize(sizeBytes: number): Result<void, ContractAnalyzerError>
  validateContractData(data: unknown): Result<ContractAnalysisResult, ContractAnalyzerError>
}

// Retry Service Interface
export interface RetryService {
  withRetry<T>(
    operation: () => Promise<T>,
    options?: RetryOptions
  ): Promise<Result<T, ContractAnalyzerError>>
}

export interface RetryOptions {
  maxAttempts?: number
  delayMs?: number
  backoffMultiplier?: number
  retryOnError?: (error: Error) => boolean
}

// Event Service Interface (for decoupling components)
export interface EventService {
  emit(event: string, data?: unknown): void
  on(event: string, handler: (data?: unknown) => void): () => void
  off(event: string, handler: (data?: unknown) => void): void
  once(event: string, handler: (data?: unknown) => void): void
}

// Type for service registry
export interface ServiceRegistry {
  textExtraction: TextExtractionService
  contractAnalysis: ContractAnalysisService
  fileStorage: FileStorageService
  authentication: AuthenticationService
  healthCheck: HealthCheckService
  configuration: ConfigurationService
  logging: LoggingService
  metrics: MetricsService
  validation: ValidationService
  retry: RetryService
  events: EventService
  cache: CacheService<unknown>
}
