/**
 * AWS Service Implementation following SOLID principles
 * Implements service interfaces with proper error handling
 */

import { TextractClient, DetectDocumentTextCommand, StartDocumentTextDetectionCommand, GetDocumentTextDetectionCommand } from '@aws-sdk/client-textract'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import { fetchAuthSession } from 'aws-amplify/auth'

import { Result, success, failure, safelyAsync } from '../types/result'
import {
  ContractAnalyzerError,
  ContractAnalysisError,
  createAWSError,
  createTextExtractionError
} from '../types/errors'
import {
  TextExtractionService,
  ContractAnalysisService,
  FileStorageService,
  LoggingService
} from './interfaces'
import { ContractAnalysisResult } from '../types/contract'
import { getAWSConfig } from '../config'
import { validateContractAnalysis, normalizeContractText, calculateTextQuality } from '../core/business-logic'

// AWS Credentials Helper
const getAWSCredentials = async (): Promise<Result<any, ContractAnalyzerError>> => {
  return safelyAsync(
    async () => {
      const session = await fetchAuthSession()
      return session.credentials
    },
    (error) => createAWSError('Cognito', 'fetchAuthSession', error)
  )
}

// AWS Client Factory
class AWSClientFactory {
  private static textractClient: TextractClient | null = null
  private static s3Client: S3Client | null = null
  private static bedrockClient: BedrockRuntimeClient | null = null

  static async getTextractClient(): Promise<Result<TextractClient, ContractAnalyzerError>> {
    if (this.textractClient) {
      return success(this.textractClient)
    }

    const credentialsResult = await getAWSCredentials()
    if (credentialsResult.kind === 'failure') {
      return credentialsResult
    }

    const config = getAWSConfig()
    this.textractClient = new TextractClient({
      region: config.region,
      credentials: credentialsResult.value
    })

    return success(this.textractClient)
  }

  static async getS3Client(): Promise<Result<S3Client, ContractAnalyzerError>> {
    if (this.s3Client) {
      return success(this.s3Client)
    }

    const credentialsResult = await getAWSCredentials()
    if (credentialsResult.kind === 'failure') {
      return credentialsResult
    }

    const config = getAWSConfig()
    this.s3Client = new S3Client({
      region: config.region,
      credentials: credentialsResult.value
    })

    return success(this.s3Client)
  }

  static async getBedrockClient(): Promise<Result<BedrockRuntimeClient, ContractAnalyzerError>> {
    if (this.bedrockClient) {
      return success(this.bedrockClient)
    }

    const credentialsResult = await getAWSCredentials()
    if (credentialsResult.kind === 'failure') {
      return credentialsResult
    }

    const config = getAWSConfig()
    this.bedrockClient = new BedrockRuntimeClient({
      region: config.region,
      credentials: credentialsResult.value
    })

    return success(this.bedrockClient)
  }

  static resetClients(): void {
    this.textractClient = null
    this.s3Client = null
    this.bedrockClient = null
  }
}

// Textract Service Implementation
export class TextractService implements TextExtractionService {
  constructor(private logger: LoggingService) {}

  async extractText(file: File): Promise<Result<string, ContractAnalyzerError>> {
    this.logger.info('Starting text extraction', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    })

    // Handle text files directly
    if (file.type === 'text/plain') {
      return this.extractFromTextFile(file)
    }

    // Handle PDFs with S3-based processing
    if (file.type === 'application/pdf') {
      return this.extractFromPDF(file)
    }

    // Handle images with direct processing
    return this.extractFromImage(file)
  }

  private async extractFromTextFile(file: File): Promise<Result<string, ContractAnalyzerError>> {
    return safelyAsync(
      async () => {
        const text = await file.text()
        return normalizeContractText(text)
      },
      (error) => createTextExtractionError(file.name, 'direct', error)
    )
  }

  private async extractFromPDF(file: File): Promise<Result<string, ContractAnalyzerError>> {
    const config = getAWSConfig()

    // Try S3-based processing first
    const s3Result = await this.extractFromPDFViaS3(file)
    if (s3Result.kind === 'success') {
      return s3Result
    }

    // Fallback to direct processing for smaller files
    if (file.size < config.textractSettings.maxDirectProcessingSize) {
      this.logger.warn('S3 processing failed, trying direct processing', {
        fileName: file.name,
        error: s3Result.error.message
      })
      return this.extractFromImage(file)
    }

    return s3Result
  }

  private async extractFromPDFViaS3(file: File): Promise<Result<string, ContractAnalyzerError>> {
    const clientResult = await AWSClientFactory.getTextractClient()
    if (clientResult.kind === 'failure') {
      return clientResult
    }

    const s3ClientResult = await AWSClientFactory.getS3Client()
    if (s3ClientResult.kind === 'failure') {
      return s3ClientResult
    }

    const config = getAWSConfig()

    // Upload to S3 first
    const uploadResult = await this.uploadToS3(file, s3ClientResult.value)
    if (uploadResult.kind === 'failure') {
      return uploadResult
    }

    // Start async text detection
    const startResult = await safelyAsync(
      async () => {
        const command = new StartDocumentTextDetectionCommand({
          DocumentLocation: {
            S3Object: {
              Bucket: config.s3BucketName,
              Name: uploadResult.value,
            },
          },
        })
        return clientResult.value.send(command)
      },
      (error) => createAWSError('Textract', 'StartDocumentTextDetection', error)
    )

    if (startResult.kind === 'failure') {
      return startResult
    }

    const jobId = startResult.value.JobId
    if (!jobId) {
      return failure(createAWSError('Textract', 'StartDocumentTextDetection', new Error('No JobId received')))
    }

    // Poll for completion
    return this.pollForCompletion(clientResult.value, jobId)
  }

  private async pollForCompletion(
    client: TextractClient,
    jobId: string
  ): Promise<Result<string, ContractAnalyzerError>> {
    const config = getAWSConfig()
    let attempts = 0
    const maxAttempts = Math.floor(config.textractSettings.timeoutMs / config.textractSettings.pollIntervalMs)

    while (attempts < maxAttempts) {
      await this.delay(config.textractSettings.pollIntervalMs)

      const getResult = await safelyAsync(
        async () => {
          const command = new GetDocumentTextDetectionCommand({ JobId: jobId })
          return client.send(command)
        },
        (error) => createAWSError('Textract', 'GetDocumentTextDetection', error)
      )

      if (getResult.kind === 'failure') {
        return getResult
      }

      const response = getResult.value
      const status = response.JobStatus

      this.logger.debug('Textract job status', {
        jobId,
        status,
        attempt: attempts + 1,
        maxAttempts
      })

      if (status === 'SUCCEEDED') {
        return this.extractTextFromBlocks(response.Blocks || [])
      } else if (status === 'FAILED') {
        return failure(createAWSError(
          'Textract',
          'GetDocumentTextDetection',
          new Error(response.StatusMessage || 'Job failed')
        ))
      }

      attempts++
    }

    return failure(createAWSError(
      'Textract',
      'GetDocumentTextDetection',
      new Error(`Job timed out after ${maxAttempts} attempts`)
    ))
  }

  private async extractFromImage(file: File): Promise<Result<string, ContractAnalyzerError>> {
    const clientResult = await AWSClientFactory.getTextractClient()
    if (clientResult.kind === 'failure') {
      return clientResult
    }

    return safelyAsync(
      async () => {
        const buffer = await file.arrayBuffer()
        const bytes = new Uint8Array(buffer)

        const command = new DetectDocumentTextCommand({
          Document: { Bytes: bytes }
        })

        const response = await clientResult.value.send(command)

        if (!response.Blocks) {
          throw new Error('No text blocks found in document')
        }

        const textResult = this.extractTextFromBlocks(response.Blocks)
        if (textResult.kind === 'failure') {
          throw textResult.error
        }

        return textResult.value
      },
      (error) => createTextExtractionError(file.name, 'direct', error)
    )
  }

  private extractTextFromBlocks(blocks: any[]): Result<string, ContractAnalyzerError> {
    try {
      const textBlocks = blocks.filter(block => block.BlockType === 'LINE')
      const extractedText = textBlocks
        .map(block => block.Text)
        .filter(text => text)
        .join('\n')

      const normalizedText = normalizeContractText(extractedText)
      const quality = calculateTextQuality(normalizedText)

      this.logger.info('Text extraction completed', {
        totalBlocks: blocks.length,
        textBlocks: textBlocks.length,
        textLength: normalizedText.length,
        quality
      })

      if (quality < 0.1) {
        return failure(createTextExtractionError(
          'unknown',
          'textract',
          new Error('Extracted text quality too low')
        ))
      }

      return success(normalizedText)
    } catch (error) {
      return failure(createTextExtractionError(
        'unknown',
        'textract',
        error instanceof Error ? error : new Error(String(error))
      ))
    }
  }

  private async uploadToS3(file: File, s3Client: S3Client): Promise<Result<string, ContractAnalyzerError>> {
    const config = getAWSConfig()
    const key = `contracts/${Date.now()}-${file.name}`

    return safelyAsync(
      async () => {
        const arrayBuffer = await file.arrayBuffer()
        const fileBuffer = new Uint8Array(arrayBuffer)

        const command = new PutObjectCommand({
          Bucket: config.s3BucketName,
          Key: key,
          Body: fileBuffer,
          ContentType: file.type,
        })

        await s3Client.send(command)
        return key
      },
      (error) => createAWSError('S3', 'PutObject', error)
    )
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  getSupportedFileTypes(): readonly string[] {
    return [
      'text/plain',
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/gif',
      'image/bmp',
      'image/tiff',
    ]
  }

  getMaxFileSize(): number {
    const config = getAWSConfig()
    return config.maxFileSize || 50 * 1024 * 1024 // 50MB
  }
}

// Bedrock Service Implementation
export class BedrockService implements ContractAnalysisService {
  constructor(private logger: LoggingService) {}

  async analyzeContract(
    text: string,
    fileName: string
  ): Promise<Result<ContractAnalysisResult, ContractAnalyzerError>> {
    this.logger.info('Starting contract analysis', {
      fileName,
      textLength: text.length
    })

    const clientResult = await AWSClientFactory.getBedrockClient()
    if (clientResult.kind === 'failure') {
      return clientResult
    }

    const config = getAWSConfig()
    const prompt = this.buildAnalysisPrompt(text)

    const analysisResult = await safelyAsync(
      async () => {
        const command = new InvokeModelCommand({
          modelId: config.bedrockSettings.modelId,
          body: JSON.stringify({
            anthropic_version: 'bedrock-2023-05-31',
            max_tokens: config.bedrockSettings.maxTokens,
            messages: [{ role: 'user', content: prompt }],
          }),
          contentType: 'application/json',
          accept: 'application/json',
        })

        const response = await clientResult.value.send(command)

        if (!response.body) {
          throw new Error('No response body from Bedrock')
        }

        const responseBody = JSON.parse(new TextDecoder().decode(response.body))
        const contentText = responseBody.content[0].text

        return JSON.parse(contentText)
      },
      (error) => new ContractAnalysisError('Bedrock invocation failed', error instanceof Error ? error : new Error(String(error)))
    )

    if (analysisResult.kind === 'failure') {
      return analysisResult
    }

    // Validate the analysis result
    const validationResult = validateContractAnalysis(analysisResult.value)
    if (validationResult.kind === 'failure') {
      this.logger.error('Contract analysis validation failed', validationResult.error)
      return validationResult
    }

    this.logger.info('Contract analysis completed successfully', { fileName })
    return success(validationResult.value)
  }

  private buildAnalysisPrompt(text: string): string {
    return `
You are a senior oil and gas attorney with 20+ years of experience reviewing lease agreements.
Analyze the following contract text and return ONLY valid JSON with the specified structure.

Contract text:
${text}

Return ONLY this JSON structure:
{
  "lessors": ["array of lessor names"],
  "lessees": ["array of lessee names"],
  "acreage": "total acreage leased",
  "depths": "depth restrictions or formations",
  "term": "primary lease term",
  "royalty": "royalty percentage",
  "insights": ["array of professional insights about unusual terms or risks"]
}

Return ONLY valid JSON. No markdown, explanations, or code blocks.`
  }

  getModelInfo() {
    const config = getAWSConfig()
    return {
      name: 'Claude 4 Sonnet',
      version: config.bedrockSettings.modelId,
      capabilities: ['contract analysis', 'legal document review', 'risk assessment']
    }
  }
}

// S3 Storage Service Implementation
export class S3StorageService implements FileStorageService {
  constructor(private logger: LoggingService) {}

  async uploadFile(file: File, key?: string): Promise<Result<string, ContractAnalyzerError>> {
    const clientResult = await AWSClientFactory.getS3Client()
    if (clientResult.kind === 'failure') {
      return clientResult
    }

    const config = getAWSConfig()
    const s3Key = key || `contracts/${Date.now()}-${file.name}`

    return safelyAsync(
      async () => {
        const arrayBuffer = await file.arrayBuffer()
        const fileBuffer = new Uint8Array(arrayBuffer)

        const command = new PutObjectCommand({
          Bucket: config.s3BucketName,
          Key: s3Key,
          Body: fileBuffer,
          ContentType: file.type,
        })

        await clientResult.value.send(command)
        this.logger.info('File uploaded to S3', { key: s3Key, size: file.size })
        return s3Key
      },
      (error) => createAWSError('S3', 'PutObject', error)
    )
  }

  async deleteFile(key: string): Promise<Result<void, ContractAnalyzerError>> {
    const clientResult = await AWSClientFactory.getS3Client()
    if (clientResult.kind === 'failure') {
      return clientResult
    }

    const config = getAWSConfig()

    return safelyAsync(
      async () => {
        const command = new DeleteObjectCommand({
          Bucket: config.s3BucketName,
          Key: key
        })

        await clientResult.value.send(command)
        this.logger.info('File deleted from S3', { key })
      },
      (error) => createAWSError('S3', 'DeleteObject', error)
    )
  }

  async getFileUrl(key: string): Promise<Result<string, ContractAnalyzerError>> {
    const config = getAWSConfig()
    const url = `https://${config.s3BucketName}.s3.${config.region}.amazonaws.com/${key}`
    return success(url)
  }

  async fileExists(_key: string): Promise<Result<boolean, ContractAnalyzerError>> {
    // Implementation would use HeadObjectCommand
    // For now, return success(true) as placeholder
    return success(true)
  }
}
