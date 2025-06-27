import { ContractAnalysis } from './ContractAnalysis'
import { FileMetadata } from '../value-objects/FileMetadata'
// Import existing types for compatibility
import { ContractData } from '../../types/contract'

/**
 * Domain Entity: Contract
 * Represents a contract document with its analysis results
 *
 * Following Domain-Driven Design principles:
 * - Has identity (id)
 * - Encapsulates business rules
 * - Maintains data integrity
 */
export class Contract {
  constructor(
    public readonly id: string,
    public readonly fileMetadata: FileMetadata,
    public readonly extractedText: string,
    public readonly analysis: ContractAnalysis,
    public readonly s3Key?: string
  ) {
    this.validateContract()
  }

  /**
   * Business rule: Contract must have valid extracted text
   */
  private validateContract(): void {
    if (!this.extractedText || this.extractedText.trim().length === 0) {
      throw new Error('Contract must have extracted text')
    }

    if (!this.fileMetadata.fileName) {
      throw new Error('Contract must have a valid file name')
    }
  }

  /**
   * Business rule: Check if contract processing was successful
   */
  public isProcessingSuccessful(): boolean {
    return !this.extractedText.startsWith('Error processing file:')
  }

  /**
   * Business rule: Check if contract has S3 storage
   */
  public hasS3Storage(): boolean {
    return this.s3Key !== undefined && this.s3Key.length > 0
  }

  /**
   * Business logic: Generate contract summary
   */
  public generateSummary(): string {
    if (!this.isProcessingSuccessful()) {
      return `Processing failed for ${this.fileMetadata.fileName}`
    }

    return `Contract: ${this.fileMetadata.fileName} | ` +
           `Lessors: ${this.analysis.lessors.join(', ')} | ` +
           `Lessees: ${this.analysis.lessees.join(', ')} | ` +
           `Royalty: ${this.analysis.royalty}`
  }

  /**
   * Convert to plain object for serialization (for compatibility with existing code)
   */
  public toPlainObject(): ContractData {
    return {
      id: this.id,
      fileName: this.fileMetadata.fileName,
      uploadDate: this.fileMetadata.uploadDate,
      extractedText: this.extractedText,
      analysis: this.analysis.toPlainObject(),
      s3Key: this.s3Key
    }
  }

  /**
   * Factory method to create from plain object (for compatibility)
   */
  public static fromPlainObject(data: ContractData): Contract {
    return new Contract(
      data.id,
      new FileMetadata(data.fileName, data.uploadDate),
      data.extractedText,
      ContractAnalysis.fromPlainObject(data.analysis),
      data.s3Key
    )
  }
}
