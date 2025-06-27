/**
 * Pure business logic functions for contract processing
 * Following functional programming principles - no side effects
 */

import { Result, success, failure, flatMap } from '../types/result'
import { ContractAnalyzerError, ValidationError, FileProcessingError } from '../types/errors'
import { ContractData, ContractAnalysisResult } from '../types/contract'

// Domain types for pure functions
export interface ProcessingStep<T, U> {
  name: string
  process: (input: T) => Result<U, ContractAnalyzerError>
}

export interface FileValidationRules {
  maxSize: number
  allowedTypes: readonly string[]
  allowedExtensions: readonly string[]
}

export interface ProcessingContext {
  fileName: string
  fileSize: number
  fileType: string
  timestamp: Date
}

export interface ContractProcessingPipeline {
  validate: ProcessingStep<File, File>
  extract: ProcessingStep<File, string>
  analyze: ProcessingStep<string, ContractAnalysisResult>
  finalize: ProcessingStep<ContractAnalysisResult, ContractData>
}

// Pure validation functions
export const validateFileSize = (
  file: File,
  maxSize: number
): Result<File, ContractAnalyzerError> => {
  if (file.size > maxSize) {
    return failure(
      new ValidationError(
        'fileSize',
        file.size,
        `Must be less than ${maxSize} bytes`,
        { fileName: file.name, actualSize: file.size, maxSize }
      )
    )
  }
  return success(file)
}

export const validateFileType = (
  file: File,
  allowedTypes: readonly string[]
): Result<File, ContractAnalyzerError> => {
  if (!allowedTypes.includes(file.type)) {
    return failure(
      new ValidationError(
        'fileType',
        file.type,
        `Must be one of: ${allowedTypes.join(', ')}`,
        { fileName: file.name, fileType: file.type, allowedTypes: [...allowedTypes] }
      )
    )
  }
  return success(file)
}

export const validateFileName = (
  file: File,
  rules?: { minLength?: number; maxLength?: number; pattern?: RegExp }
): Result<File, ContractAnalyzerError> => {
  const { minLength = 1, maxLength = 255, pattern } = rules || {}

  if (file.name.length < minLength || file.name.length > maxLength) {
    return failure(
      new ValidationError(
        'fileName',
        file.name,
        `Length must be between ${minLength} and ${maxLength} characters`,
        { fileName: file.name, length: file.name.length }
      )
    )
  }

  if (pattern && !pattern.test(file.name)) {
    return failure(
      new ValidationError(
        'fileName',
        file.name,
        `Must match pattern: ${pattern.source}`,
        { fileName: file.name, pattern: pattern.source }
      )
    )
  }

  return success(file)
}

// Compose validation functions
export const createFileValidator = (
  rules: FileValidationRules
) => (file: File): Result<File, ContractAnalyzerError> => {
  return flatMap(
    flatMap(
      validateFileSize(file, rules.maxSize),
      (validatedFile) => validateFileType(validatedFile, rules.allowedTypes)
    ),
    (validatedFile) => validateFileName(validatedFile)
  )
}

// Pure contract analysis functions
export const validateContractAnalysis = (
  analysis: unknown
): Result<ContractAnalysisResult, ContractAnalyzerError> => {
  if (!analysis || typeof analysis !== 'object') {
    return failure(
      new ValidationError(
        'contractAnalysis',
        analysis,
        'Must be a valid object',
        { receivedType: typeof analysis }
      )
    )
  }

  const result = analysis as Record<string, unknown>

  // Required fields validation
  const requiredFields = ['lessors', 'lessees', 'acreage', 'depths', 'term', 'royalty', 'insights']
  for (const field of requiredFields) {
    if (!(field in result)) {
      return failure(
        new ValidationError(
          'contractAnalysis',
          analysis,
          `Missing required field: ${field}`,
          { missingField: field }
        )
      )
    }
  }

  // Type validation
  if (!Array.isArray(result.lessors) || !Array.isArray(result.lessees) || !Array.isArray(result.insights)) {
    return failure(
      new ValidationError(
        'contractAnalysis',
        analysis,
        'lessors, lessees, and insights must be arrays',
        {
          lessorsType: typeof result.lessors,
          lesseesType: typeof result.lessees,
          insightsType: typeof result.insights
        }
      )
    )
  }

  return success({
    lessors: result.lessors as string[],
    lessees: result.lessees as string[],
    acreage: String(result.acreage),
    depths: String(result.depths),
    term: String(result.term),
    royalty: String(result.royalty),
    insights: result.insights as string[],
  })
}

// Pure contract data creation
export const createContractData = (
  file: File,
  extractedText: string,
  analysis: ContractAnalysisResult,
  s3Key?: string
): ContractData => ({
  id: generateContractId(),
  fileName: file.name,
  uploadDate: new Date(),
  extractedText,
  analysis,
  s3Key,
})

// Pure ID generation (deterministic for testing)
export const generateContractId = (seed?: string): string => {
  const timestamp = Date.now().toString()
  const random = Math.random().toString(36).substr(2, 9)
  const seedSuffix = seed ? `-${seed}` : ''
  return `contract-${timestamp}-${random}${seedSuffix}`
}

// Processing context creation
export const createProcessingContext = (file: File): ProcessingContext => ({
  fileName: file.name,
  fileSize: file.size,
  fileType: file.type,
  timestamp: new Date(),
})

// Pure error handling functions
export const categorizeError = (error: unknown): ContractAnalyzerError => {
  if (error instanceof ContractAnalyzerError) {
    return error
  }

  if (error instanceof Error) {
    return new FileProcessingError(
      'unknown',
      'analysis',
      error,
      { originalError: error.message }
    )
  }

  return new FileProcessingError(
    'unknown',
    'analysis',
    new Error(String(error)),
    { originalValue: error }
  )
}

// Pure data transformation functions
export const normalizeContractText = (text: string): string => {
  return text
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\n{3,}/g, '\n\n') // Collapse multiple newlines
    .replace(/^\s+/gm, '') // Remove leading whitespace from lines
    .trim()
}

export const extractKeywords = (text: string): string[] => {
  const keywords = [
    'lessor', 'lessee', 'royalty', 'bonus', 'lease', 'mineral rights',
    'drilling', 'production', 'oil', 'gas', 'acreage', 'term', 'depth',
    'formation', 'pooling', 'unitization', 'assignment'
  ]

  const normalizedText = text.toLowerCase()
  return keywords.filter(keyword => normalizedText.includes(keyword))
}

export const calculateTextQuality = (text: string): number => {
  if (!text || text.length === 0) return 0

  const factors = {
    length: Math.min(text.length / 1000, 1), // Prefer longer texts up to 1000 chars
    wordCount: Math.min(text.split(/\s+/).length / 100, 1), // Prefer more words up to 100
    keywords: extractKeywords(text).length / 10, // Prefer texts with contract keywords
    structure: text.includes('\n') ? 0.2 : 0, // Prefer structured text
  }

  return Math.min(
    (factors.length * 0.3 + factors.wordCount * 0.3 + factors.keywords * 0.3 + factors.structure),
    1
  )
}

// Pure pipeline composition
export const composeProcessingSteps = <A, B, C>(
  step1: ProcessingStep<A, B>,
  step2: ProcessingStep<B, C>
): ProcessingStep<A, C> => ({
  name: `${step1.name} -> ${step2.name}`,
  process: (input: A) => flatMap(step1.process(input), step2.process)
})

// Pipeline builder
export const buildProcessingPipeline = (
  steps: ProcessingStep<unknown, unknown>[]
): ProcessingStep<unknown, unknown> => {
  return steps.reduce((pipeline, step) =>
    composeProcessingSteps(pipeline, step)
  )
}

// Pure analysis enhancement
export const enhanceAnalysisWithMetadata = (
  analysis: ContractAnalysisResult,
  context: ProcessingContext
): ContractAnalysisResult => ({
  ...analysis,
  insights: [
    ...analysis.insights,
    `Processed ${context.fileName} (${(context.fileSize / 1024).toFixed(1)}KB) on ${context.timestamp.toISOString()}`,
  ],
})

// Pure contract comparison
export const compareContracts = (
  contract1: ContractData,
  contract2: ContractData
): ContractComparisonResult => ({
  similarity: calculateSimilarity(contract1.analysis, contract2.analysis),
  differences: findDifferences(contract1.analysis, contract2.analysis),
  commonTerms: findCommonTerms(contract1.analysis, contract2.analysis),
})

interface ContractComparisonResult {
  similarity: number
  differences: string[]
  commonTerms: string[]
}

const calculateSimilarity = (
  analysis1: ContractAnalysisResult,
  analysis2: ContractAnalysisResult
): number => {
  const fields = ['acreage', 'depths', 'term', 'royalty']
  const matches = fields.filter(field =>
    analysis1[field as keyof ContractAnalysisResult] === analysis2[field as keyof ContractAnalysisResult]
  ).length

  return matches / fields.length
}

const findDifferences = (
  analysis1: ContractAnalysisResult,
  analysis2: ContractAnalysisResult
): string[] => {
  const differences: string[] = []
  const fields = ['acreage', 'depths', 'term', 'royalty'] as const

  for (const field of fields) {
    if (analysis1[field] !== analysis2[field]) {
      differences.push(`${field}: "${analysis1[field]}" vs "${analysis2[field]}"`)
    }
  }

  return differences
}

const findCommonTerms = (
  analysis1: ContractAnalysisResult,
  analysis2: ContractAnalysisResult
): string[] => {
  const terms1 = [...analysis1.lessors, ...analysis1.lessees]
  const terms2 = [...analysis2.lessors, ...analysis2.lessees]

  return terms1.filter(term => terms2.includes(term))
}
