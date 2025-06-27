/**
 * Centralized configuration management
 * Following the principle of single source of truth
 */

import { ConfigurationError } from '../types/errors'

export interface AWSConfig {
  readonly region: string
  readonly s3BucketName: string
  readonly textractMaxRetries: number
  readonly textractPollIntervalMs: number
  readonly textractTimeoutMs: number
  readonly bedrockModelId: string
  readonly bedrockMaxTokens: number
  readonly textractSettings: TextractSettings
  readonly bedrockSettings: BedrockSettings
  readonly maxFileSize: number
}

export interface TextractSettings {
  readonly maxRetries: number
  readonly pollIntervalMs: number
  readonly timeoutMs: number
  readonly maxDirectProcessingSize: number
}

export interface BedrockSettings {
  readonly modelId: string
  readonly maxTokens: number
  readonly temperature?: number
}

export interface FileProcessingConfig {
  readonly maxFileSize: number
  readonly maxFileSizeForDirectProcessing: number
  readonly maxFileSizeForFallback: number
  readonly supportedFileTypes: readonly string[]
  readonly supportedImageTypes: readonly string[]
}

export interface UIConfig {
  readonly maxConcurrentUploads: number
  readonly uploadTimeoutMs: number
  readonly analysisTimeoutMs: number
}

export interface AppConfig {
  readonly aws: AWSConfig
  readonly fileProcessing: FileProcessingConfig
  readonly ui: UIConfig
  readonly environment: 'development' | 'production' | 'test'
}

// Default configuration
const DEFAULT_CONFIG: AppConfig = {
  aws: {
    region: 'us-east-1',
    s3BucketName: 'oil-gas-contracts-474668386339-us-east-1',
    textractMaxRetries: 100,
    textractPollIntervalMs: 3000,
    textractTimeoutMs: 300000, // 5 minutes
    bedrockModelId: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
    bedrockMaxTokens: 2000,
    maxFileSize: 50 * 1024 * 1024, // 50MB
    textractSettings: {
      maxRetries: 100,
      pollIntervalMs: 3000,
      timeoutMs: 300000, // 5 minutes
      maxDirectProcessingSize: 5 * 1024 * 1024, // 5MB
    },
    bedrockSettings: {
      modelId: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
      maxTokens: 2000,
    },
  },
  fileProcessing: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    maxFileSizeForDirectProcessing: 5 * 1024 * 1024, // 5MB
    maxFileSizeForFallback: 2 * 1024 * 1024, // 2MB
    supportedFileTypes: [
      'text/plain',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ] as const,
    supportedImageTypes: [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/gif',
      'image/bmp',
      'image/tiff',
    ] as const,
  },
  ui: {
    maxConcurrentUploads: 5,
    uploadTimeoutMs: 30000, // 30 seconds
    analysisTimeoutMs: 600000, // 10 minutes
  },
  environment: 'production',
}

// Environment-specific overrides
const DEVELOPMENT_CONFIG: Partial<AppConfig> = {
  environment: 'development',
  aws: {
    ...DEFAULT_CONFIG.aws,
    textractTimeoutMs: 60000, // 1 minute for dev
    textractSettings: {
      ...DEFAULT_CONFIG.aws.textractSettings,
      timeoutMs: 60000, // 1 minute for dev
    },
  },
  ui: {
    ...DEFAULT_CONFIG.ui,
    analysisTimeoutMs: 120000, // 2 minutes for dev
  },
}

const TEST_CONFIG: Partial<AppConfig> = {
  environment: 'test',
  aws: {
    ...DEFAULT_CONFIG.aws,
    s3BucketName: 'test-contracts-bucket',
    textractTimeoutMs: 10000, // 10 seconds for tests
    maxFileSize: 1024 * 1024, // 1MB for tests
    textractSettings: {
      ...DEFAULT_CONFIG.aws.textractSettings,
      timeoutMs: 10000, // 10 seconds for tests
    },
  },
  fileProcessing: {
    ...DEFAULT_CONFIG.fileProcessing,
    maxFileSize: 1024 * 1024, // 1MB for tests
  },
}

// Configuration validation
const validateConfig = (config: AppConfig): void => {
  if (!config.aws.region) {
    throw new ConfigurationError('aws.region', 'Region is required')
  }

  if (!config.aws.s3BucketName) {
    throw new ConfigurationError('aws.s3BucketName', 'S3 bucket name is required')
  }

  if (config.fileProcessing.maxFileSize <= 0) {
    throw new ConfigurationError('fileProcessing.maxFileSize', 'Must be greater than 0')
  }

  if (config.aws.textractPollIntervalMs <= 0) {
    throw new ConfigurationError('aws.textractPollIntervalMs', 'Must be greater than 0')
  }

  if (config.aws.textractTimeoutMs <= config.aws.textractPollIntervalMs) {
    throw new ConfigurationError(
      'aws.textractTimeoutMs',
      'Must be greater than poll interval'
    )
  }
}

// Configuration factory
const createConfig = (): AppConfig => {
  const env = import.meta.env.MODE || 'production'

  let config: AppConfig

  switch (env) {
    case 'development':
      config = { ...DEFAULT_CONFIG, ...DEVELOPMENT_CONFIG }
      break
    case 'test':
      config = { ...DEFAULT_CONFIG, ...TEST_CONFIG }
      break
    default:
      config = DEFAULT_CONFIG
  }

  // Apply environment variable overrides
  if (import.meta.env.VITE_AWS_REGION) {
    config = {
      ...config,
      aws: {
        ...config.aws,
        region: import.meta.env.VITE_AWS_REGION,
      },
    }
  }

  if (import.meta.env.VITE_S3_BUCKET_NAME) {
    config = {
      ...config,
      aws: {
        ...config.aws,
        s3BucketName: import.meta.env.VITE_S3_BUCKET_NAME,
      },
    }
  }

  validateConfig(config)
  return config
}

// Singleton instance
let configInstance: AppConfig | null = null

export const getConfig = (): AppConfig => {
  if (!configInstance) {
    configInstance = createConfig()
  }
  return configInstance
}

// Config access helpers
export const getAWSConfig = (): AWSConfig => getConfig().aws
export const getFileProcessingConfig = (): FileProcessingConfig => getConfig().fileProcessing
export const getUIConfig = (): UIConfig => getConfig().ui

// Configuration utilities
export const isFileTypeSupported = (mimeType: string): boolean => {
  const config = getFileProcessingConfig()
  return [
    ...config.supportedFileTypes,
    ...config.supportedImageTypes,
  ].includes(mimeType as any)
}

export const isFileSizeValid = (size: number): boolean => {
  const config = getFileProcessingConfig()
  return size <= config.maxFileSize && size > 0
}

export const shouldUseDirectProcessing = (size: number): boolean => {
  const config = getFileProcessingConfig()
  return size <= config.maxFileSizeForDirectProcessing
}

export const shouldUseFallback = (size: number): boolean => {
  const config = getFileProcessingConfig()
  return size <= config.maxFileSizeForFallback
}

// Development utilities
export const resetConfig = (): void => {
  configInstance = null
}

export const overrideConfig = (overrides: Partial<AppConfig>): void => {
  configInstance = { ...getConfig(), ...overrides }
}
