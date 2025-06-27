/**
 * Use Case: Process Contract Files
 * Orchestrates the business logic for processing contract files
 *
 * Following Clean Architecture principles:
 * - Coordinates between domain services and infrastructure
 * - Contains application-specific business rules
 * - Independent of UI framework details
 */

import { ContractData, ContractAnalysisResult } from '../../types/contract'
import { ContractValidationService } from '../../domain/services/ContractValidationService'
import { ContractAnalysisService } from '../../domain/services/ContractAnalysisService'

export interface ITextExtractor {
  extractText(file: File): Promise<string>
}

export interface IContractAnalyzer {
  analyzeContract(text: string, fileName: string): Promise<ContractAnalysisResult>
}

export interface ILogger {
  info(message: string, metadata?: any): void
  error(message: string, error?: Error, metadata?: any): void
}

export class ProcessContractFilesUseCase {
  constructor(
    private textExtractor: ITextExtractor,
    private contractAnalyzer: IContractAnalyzer,
    private logger: ILogger
  ) {}

  /**
   * Execute the use case: process multiple contract files
   */
  async execute(files: File[]): Promise<ContractData[]> {
    this.logger.info(`Starting to process ${files.length} files`, { fileCount: files.length })

    // Validate files before processing
    const validationResults = this.validateFiles(files)
    if (validationResults.hasErrors) {
      this.logger.error('File validation failed', undefined, { errors: validationResults.errors })
      throw new Error(`File validation failed: ${validationResults.errors.join(', ')}`)
    }

    // Sort files by processing priority (domain logic)
    const sortedFiles = this.sortFilesByPriority(files)

    // Process all files (can be done in parallel as per original design)
    const processPromises = sortedFiles.map((file, index) =>
      this.processIndividualFile(file, index, files.length)
    )

    try {
      const results = await Promise.all(processPromises)
      this.logger.info(`Successfully processed ${results.length} files`)
      return results
    } catch (error) {
      this.logger.error('Error during parallel processing', error instanceof Error ? error : new Error('Unknown error'))
      throw error
    }
  }

  /**
   * Validate all files using domain rules
   */
  private validateFiles(files: File[]): { hasErrors: boolean; errors: string[] } {
    const allErrors: string[] = []

    for (const file of files) {
      // Validate file metadata
      const metadataValidation = ContractValidationService.validateFileMetadata(file.name, file.size)
      if (!metadataValidation.isValid) {
        allErrors.push(...metadataValidation.errors.map((error: string) => `${file.name}: ${error}`))
      }

      // Validate file type
      const typeValidation = ContractValidationService.isSupportedFileType(file.name, file.type)
      if (!typeValidation.isSupported) {
        allErrors.push(`${file.name}: Unsupported file type`)
      }
    }

    return {
      hasErrors: allErrors.length > 0,
      errors: allErrors
    }
  }

  /**
   * Sort files by processing priority using domain logic
   */
  private sortFilesByPriority(files: File[]): File[] {
    return [...files].sort((a, b) => {
      const priorityA = ContractValidationService.getProcessingPriority(a.name, a.size)
      const priorityB = ContractValidationService.getProcessingPriority(b.name, b.size)
      return priorityB - priorityA // Higher priority first
    })
  }

  /**
   * Process a single contract file
   */
  private async processIndividualFile(file: File, index: number, totalFiles: number): Promise<ContractData> {
    const fileId = this.generateFileId()

    try {
      this.logger.info(`Starting processing for file ${index + 1}/${totalFiles}: ${file.name}`)

      // Step 1: Extract text using infrastructure service
      const extractedText = await this.textExtractor.extractText(file)

      this.logger.info(`Text extraction completed for ${file.name}, starting analysis...`)

      // Step 2: Analyze contract using infrastructure service
      const analysis = await this.contractAnalyzer.analyzeContract(extractedText, file.name)

      // Step 3: Apply domain validation to ensure quality
      const isValidAnalysis = ContractValidationService.isAnalysisSuccessful(analysis)
      if (!isValidAnalysis) {
        this.logger.error(`Analysis quality check failed for ${file.name}`)
        // Continue with the analysis but log the quality issue
      }

      this.logger.info(`Successfully processed ${file.name}`)

      // Step 4: Create contract data using domain logic
      return this.createContractData(fileId, file, extractedText, analysis)

    } catch (error) {
      this.logger.error(`Error processing file ${file.name}`, error instanceof Error ? error : new Error('Unknown error'))

      // Create error contract using domain service
      return this.createErrorContract(fileId, file, error)
    }
  }

  /**
   * Create successful contract data
   */
  private createContractData(
    id: string,
    file: File,
    extractedText: string,
    analysis: ContractAnalysisResult
  ): ContractData {
    return {
      id,
      fileName: file.name,
      uploadDate: new Date(),
      extractedText,
      analysis,
      s3Key: this.generateS3Key(file)
    }
  }

  /**
   * Create error contract using domain logic
   */
  private createErrorContract(id: string, file: File, error: unknown): ContractData {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return {
      id,
      fileName: file.name,
      uploadDate: new Date(),
      extractedText: `Error processing file: ${errorMessage}`,
      analysis: {
        lessors: ['Error in processing'],
        lessees: ['Error in processing'],
        acreage: 'Error in processing',
        depths: 'Error in processing',
        term: 'Error in processing',
        royalty: 'Error in processing',
        insights: [`Failed to process ${file.name}. Please try again or contact support.`]
      },
      s3Key: undefined
    }
  }

  /**
   * Generate unique file ID using domain logic
   */
  private generateFileId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9)
  }

  /**
   * Generate S3 key using domain logic
   */
  private generateS3Key(file: File): string | undefined {
    // For PDFs, generate S3 key (this logic might change based on file type)
    if (file.type === 'application/pdf') {
      return `contracts/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    }
    return undefined
  }
}

/**
 * Result type for use case execution
 */
export interface ProcessContractFilesResult {
  success: boolean
  contracts: ContractData[]
  errors: string[]
  summary: {
    totalFiles: number
    successfullyProcessed: number
    failed: number
    averageQualityScore: number
    highRiskContracts: number
  }
}

/**
 * Enhanced use case with detailed result reporting
 */
export class ProcessContractFilesUseCaseEnhanced extends ProcessContractFilesUseCase {

  async executeWithDetailedResult(files: File[]): Promise<ProcessContractFilesResult> {
    try {
      const contracts = await this.execute(files)
      const summary = this.generateSummary(contracts)

      return {
        success: true,
        contracts,
        errors: [],
        summary
      }
    } catch (error) {
      return {
        success: false,
        contracts: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        summary: {
          totalFiles: files.length,
          successfullyProcessed: 0,
          failed: files.length,
          averageQualityScore: 0,
          highRiskContracts: 0
        }
      }
    }
  }

  /**
   * Generate processing summary using domain services
   */
  private generateSummary(contracts: ContractData[]) {
    const successfulContracts = contracts.filter(c =>
      ContractValidationService.isAnalysisSuccessful(c.analysis)
    )

    const qualityScores = contracts.map(c =>
      ContractAnalysisService.calculateQualityScore(c.analysis)
    )

    const highRiskContracts = contracts.filter(c =>
      ContractAnalysisService.calculateRiskScore(c.analysis) > 70
    )

    const averageQualityScore = qualityScores.length > 0
      ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length
      : 0

    return {
      totalFiles: contracts.length,
      successfullyProcessed: successfulContracts.length,
      failed: contracts.length - successfulContracts.length,
      averageQualityScore: Math.round(averageQualityScore),
      highRiskContracts: highRiskContracts.length
    }
  }
}
