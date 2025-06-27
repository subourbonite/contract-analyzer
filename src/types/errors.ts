/**
 * Domain-specific error types for the contract analyzer
 * Following best practices for error handling and debugging
 */

export abstract class ContractAnalyzerError extends Error {
  abstract readonly code: string
  abstract readonly context?: Record<string, unknown>
  readonly cause?: Error

  constructor(message: string, cause?: Error) {
    super(message)
    this.name = this.constructor.name
    this.cause = cause
  }
}

// AWS Service Errors
export class AWSServiceError extends ContractAnalyzerError {
  readonly code = 'AWS_SERVICE_ERROR'

  constructor(
    service: string,
    operation: string,
    originalError: Error,
    public readonly context?: Record<string, unknown>
  ) {
    super(`AWS ${service} ${operation} failed: ${originalError.message}`, originalError)
  }
}

export class TextExtractionError extends ContractAnalyzerError {
  readonly code = 'TEXT_EXTRACTION_ERROR'

  constructor(
    fileName: string,
    method: 'textract' | 'direct' | 'fallback',
    originalError: Error,
    public readonly context?: Record<string, unknown>
  ) {
    super(`Text extraction failed for ${fileName} using ${method}: ${originalError.message}`, originalError)
  }
}

export class ContractAnalysisError extends ContractAnalyzerError {
  readonly code = 'CONTRACT_ANALYSIS_ERROR'

  constructor(
    reason: string,
    originalError?: Error,
    public readonly context?: Record<string, unknown>
  ) {
    super(`Contract analysis failed: ${reason}`, originalError)
  }
}

// File Processing Errors
export class FileProcessingError extends ContractAnalyzerError {
  readonly code = 'FILE_PROCESSING_ERROR'

  constructor(
    fileName: string,
    stage: 'upload' | 'extraction' | 'analysis',
    originalError: Error,
    public readonly context?: Record<string, unknown>
  ) {
    super(`File processing failed for ${fileName} at ${stage}: ${originalError.message}`, originalError)
  }
}

export class FileSizeError extends ContractAnalyzerError {
  readonly code = 'FILE_SIZE_ERROR'

  constructor(
    fileName: string,
    actualSize: number,
    maxSize: number,
    public readonly context?: Record<string, unknown>
  ) {
    super(`File ${fileName} (${actualSize} bytes) exceeds maximum size of ${maxSize} bytes`)
  }
}

export class UnsupportedFileTypeError extends ContractAnalyzerError {
  readonly code = 'UNSUPPORTED_FILE_TYPE'

  constructor(
    fileName: string,
    fileType: string,
    supportedTypes: string[],
    public readonly context?: Record<string, unknown>
  ) {
    super(`File ${fileName} has unsupported type ${fileType}. Supported types: ${supportedTypes.join(', ')}`)
  }
}

// Configuration Errors
export class ConfigurationError extends ContractAnalyzerError {
  readonly code = 'CONFIGURATION_ERROR'

  constructor(
    configKey: string,
    reason: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(`Configuration error for ${configKey}: ${reason}`)
  }
}

// Authentication Errors
export class AuthenticationError extends ContractAnalyzerError {
  readonly code = 'AUTHENTICATION_ERROR'

  constructor(
    reason: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(`Authentication failed: ${reason}`)
  }
}

// Validation Errors
export class ValidationError extends ContractAnalyzerError {
  readonly code = 'VALIDATION_ERROR'

  constructor(
    field: string,
    value: unknown,
    requirement: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(`Validation failed for ${field}: ${requirement}. Got: ${value}`)
  }
}

// Network/Timeout Errors
export class TimeoutError extends ContractAnalyzerError {
  readonly code = 'TIMEOUT_ERROR'

  constructor(
    operation: string,
    timeoutMs: number,
    public readonly context?: Record<string, unknown>
  ) {
    super(`Operation ${operation} timed out after ${timeoutMs}ms`)
  }
}

// Error factory functions for consistent error creation
export const createAWSError = (
  service: string,
  operation: string,
  error: unknown,
  context?: Record<string, unknown>
): AWSServiceError => {
  const originalError = error instanceof Error ? error : new Error(String(error))
  return new AWSServiceError(service, operation, originalError, context)
}

export const createTextExtractionError = (
  fileName: string,
  method: 'textract' | 'direct' | 'fallback',
  error: unknown,
  context?: Record<string, unknown>
): TextExtractionError => {
  const originalError = error instanceof Error ? error : new Error(String(error))
  return new TextExtractionError(fileName, method, originalError, context)
}

export const createFileProcessingError = (
  fileName: string,
  stage: 'upload' | 'extraction' | 'analysis',
  error: unknown,
  context?: Record<string, unknown>
): FileProcessingError => {
  const originalError = error instanceof Error ? error : new Error(String(error))
  return new FileProcessingError(fileName, stage, originalError, context)
}

// Error logging utility
export const logError = (error: ContractAnalyzerError): void => {
  console.error(`[${error.code}] ${error.message}`, {
    name: error.name,
    code: error.code,
    context: error.context,
    cause: error.cause,
    stack: error.stack,
  })
}

// Error recovery strategies
export type ErrorRecoveryStrategy<T> = (error: ContractAnalyzerError) => T | null

export const withErrorRecovery = <T>(
  error: ContractAnalyzerError,
  strategies: Partial<Record<ContractAnalyzerError['code'], ErrorRecoveryStrategy<T>>>
): T | null => {
  const strategy = strategies[error.code]
  return strategy ? strategy(error) : null
}
