/**
 * Infrastructure Adapter: AWS Textract Text Extractor
 * Implements ITextExtractor interface using AWS Textract service
 *
 * Following Adapter Pattern and Dependency Inversion:
 * - Implements domain-defined interface
 * - Wraps AWS-specific implementation details
 * - Can be easily mocked for testing
 */

import { ITextExtractor } from '../../application/use-cases/ProcessContractFilesUseCase'

export class TextractExtractor implements ITextExtractor {

  async extractText(file: File): Promise<string> {
    try {
      // Import AWS services dynamically to avoid bundling issues
      const { extractTextWithTextract } = await import('../../utils/awsServices')

      // Use existing AWS implementation
      const extractedText = await extractTextWithTextract(file)

      // Apply any domain-specific validation or processing here
      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('No text could be extracted from the file')
      }

      return extractedText

    } catch (error) {
      // Transform infrastructure errors into domain-friendly errors
      const message = error instanceof Error ? error.message : 'Unknown extraction error'
      throw new Error(`Text extraction failed: ${message}`)
    }
  }

  /**
   * Check if file type is supported for extraction
   */
  isFileTypeSupported(file: File): boolean {
    const supportedTypes = [
      'application/pdf',
      'text/plain',
      'image/png',
      'image/jpeg',
      'image/gif',
      'image/bmp',
      'image/tiff'
    ]

    const supportedExtensions = ['pdf', 'txt', 'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff']
    const extension = file.name.toLowerCase().split('.').pop() || ''

    return supportedTypes.includes(file.type) || supportedExtensions.includes(extension)
  }

  /**
   * Estimate processing time based on file characteristics
   */
  estimateProcessingTime(file: File): number {
    const sizeInMB = file.size / (1024 * 1024)

    if (file.type === 'text/plain') {
      return 1000 // 1 second for text files
    } else if (file.type === 'application/pdf') {
      return Math.max(3000, sizeInMB * 1000) // 3 seconds minimum, +1 second per MB
    } else if (file.type.startsWith('image/')) {
      return Math.max(5000, sizeInMB * 2000) // 5 seconds minimum, +2 seconds per MB for OCR
    }

    return 10000 // 10 seconds default
  }
}

/**
 * Mock implementation for testing purposes
 */
export class MockTextExtractor implements ITextExtractor {
  constructor(private mockResponses: Map<string, string> = new Map()) {}

  async extractText(file: File): Promise<string> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 100))

    // Return mock response if available, otherwise return default
    const mockResponse = this.mockResponses.get(file.name)
    if (mockResponse) {
      return mockResponse
    }

    // Default mock response
    return `Mock extracted text for ${file.name}. This is a sample oil and gas lease agreement between ABC Company as lessor and XYZ Energy as lessee for 160 acres with 1/8th royalty for a 5-year term.`
  }

  /**
   * Add mock response for specific file
   */
  addMockResponse(fileName: string, extractedText: string): void {
    this.mockResponses.set(fileName, extractedText)
  }

  /**
   * Add mock error for testing error handling
   */
  addMockError(fileName: string, errorMessage: string): void {
    this.mockResponses.set(fileName, `ERROR: ${errorMessage}`)
  }
}

/**
 * Factory for creating text extractors based on environment
 */
export class TextExtractorFactory {
  static create(environment: 'production' | 'development' | 'test' = 'production'): ITextExtractor {
    switch (environment) {
      case 'test':
        return new MockTextExtractor()
      case 'development':
        // Could return a development-specific implementation
        return new TextractExtractor()
      case 'production':
      default:
        return new TextractExtractor()
    }
  }
}
