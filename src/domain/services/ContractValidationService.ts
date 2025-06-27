/**
 * Domain Service: ContractValidationService
 * Contains pure business logic for validating contracts and contract data
 *
 * Following Functional Core principles:
 * - Pure functions with no side effects
 * - Domain rules and validation logic
 * - Independent of infrastructure concerns
 */

import { ContractAnalysisResult } from '../../types/contract'

export class ContractValidationService {
  /**
   * Business rule: Validate if contract analysis indicates successful processing
   */
  static isAnalysisSuccessful(analysis: ContractAnalysisResult): boolean {
    return !this.hasProcessingErrors(analysis) && this.hasRequiredFields(analysis)
  }

  /**
   * Business rule: Check if analysis indicates processing errors
   */
  static hasProcessingErrors(analysis: ContractAnalysisResult): boolean {
    return analysis.lessors.includes('Error in processing') ||
           analysis.lessees.includes('Error in processing') ||
           analysis.insights.some(insight => insight.includes('Failed to process'))
  }

  /**
   * Business rule: Check if analysis has all required fields
   */
  static hasRequiredFields(analysis: ContractAnalysisResult): boolean {
    return analysis.lessors.length > 0 &&
           analysis.lessees.length > 0 &&
           analysis.acreage !== 'Not found' &&
           analysis.depths !== 'Not found' &&
           analysis.term !== 'Not found' &&
           analysis.royalty !== 'Not found' &&
           analysis.insights.length > 0
  }

  /**
   * Business rule: Validate file metadata
   */
  static validateFileMetadata(fileName: string, fileSize: number): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = []

    // File name validation
    if (!fileName || fileName.trim().length === 0) {
      errors.push('File name cannot be empty')
    }

    if (fileName.length > 255) {
      errors.push('File name cannot exceed 255 characters')
    }

    // File size validation (50MB limit)
    const maxSizeInBytes = 50 * 1024 * 1024
    if (fileSize > maxSizeInBytes) {
      errors.push(`File size (${(fileSize / 1024 / 1024).toFixed(1)}MB) exceeds maximum allowed size of 50MB`)
    }

    if (fileSize <= 0) {
      errors.push('File size must be greater than 0')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Business rule: Validate supported file types
   */
  static isSupportedFileType(fileName: string, mimeType?: string): {
    isSupported: boolean;
    fileType: string;
  } {
    const extension = this.getFileExtension(fileName)
    const supportedTypes = {
      'pdf': 'PDF Document',
      'txt': 'Text Document',
      'doc': 'Word Document',
      'docx': 'Word Document',
      'png': 'Image',
      'jpg': 'Image',
      'jpeg': 'Image',
      'gif': 'Image',
      'bmp': 'Image',
      'tiff': 'Image'
    }

    const isSupported = Object.keys(supportedTypes).includes(extension) ||
                       (mimeType !== undefined && this.isSupportedMimeType(mimeType))

    return {
      isSupported,
      fileType: supportedTypes[extension as keyof typeof supportedTypes] || 'Unknown'
    }
  }

  /**
   * Business rule: Extract file extension
   */
  private static getFileExtension(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf('.')
    return lastDotIndex > 0 ? fileName.substring(lastDotIndex + 1).toLowerCase() : ''
  }

  /**
   * Business rule: Check supported MIME types
   */
  private static isSupportedMimeType(mimeType: string): boolean {
    const supportedMimeTypes = [
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/png',
      'image/jpeg',
      'image/gif',
      'image/bmp',
      'image/tiff'
    ]

    return supportedMimeTypes.includes(mimeType)
  }

  /**
   * Business rule: Generate file processing priority
   * Returns higher priority number for files that should be processed first
   */
  static getProcessingPriority(fileName: string, fileSize: number): number {
    const extension = this.getFileExtension(fileName)

    // Priority based on file type (higher = processed first)
    const typePriority = {
      'txt': 10,  // Text files are fastest to process
      'pdf': 5,   // PDFs require more processing
      'doc': 3,   // Word docs need conversion
      'docx': 3,
      'png': 2,   // Images require OCR
      'jpg': 2,
      'jpeg': 2,
      'gif': 1,
      'bmp': 1,
      'tiff': 1
    }

    let priority = typePriority[extension as keyof typeof typePriority] || 1

    // Adjust priority based on file size (smaller files get higher priority)
    const sizeInMB = fileSize / (1024 * 1024)
    if (sizeInMB < 1) {
      priority += 5
    } else if (sizeInMB < 5) {
      priority += 2
    } else if (sizeInMB > 20) {
      priority -= 2
    }

    return Math.max(1, priority)
  }
}
