// Import existing interface for compatibility
import { ContractAnalysisResult } from '../../types/contract'

/**
 * Domain Entity: ContractAnalysis
 * Represents the analysis results of a contract
 *
 * Following Domain-Driven Design principles:
 * - Encapsulates business rules for contract analysis
 * - Maintains data integrity
 * - Contains domain logic for analysis validation
 */
export class ContractAnalysis {
  constructor(
    public readonly lessors: string[],
    public readonly lessees: string[],
    public readonly acreage: string,
    public readonly depths: string,
    public readonly term: string,
    public readonly royalty: string,
    public readonly insights: string[]
  ) {
    this.validateAnalysis()
  }

  /**
   * Business rule: Analysis must have valid data
   */
  private validateAnalysis(): void {
    if (!this.lessors || this.lessors.length === 0) {
      throw new Error('Analysis must have at least one lessor')
    }

    if (!this.lessees || this.lessees.length === 0) {
      throw new Error('Analysis must have at least one lessee')
    }

    if (!this.insights || this.insights.length === 0) {
      throw new Error('Analysis must have insights')
    }
  }

  /**
   * Business logic: Check if analysis indicates processing error
   */
  public hasProcessingError(): boolean {
    return this.lessors.includes('Error in processing') ||
           this.lessees.includes('Error in processing') ||
           this.insights.some(insight => insight.includes('Failed to process'))
  }

  /**
   * Business logic: Check if analysis is complete and valid
   */
  public isComplete(): boolean {
    return !this.hasProcessingError() &&
           this.acreage !== 'Not found' &&
           this.depths !== 'Not found' &&
           this.term !== 'Not found' &&
           this.royalty !== 'Not found'
  }

  /**
   * Business logic: Extract royalty percentage as number
   */
  public getRoyaltyPercentage(): number | null {
    if (this.hasProcessingError()) return null

    // Try to extract percentage from royalty string
    const percentMatch = this.royalty.match(/(\d+(?:\.\d+)?)\s*%/)
    if (percentMatch) {
      return parseFloat(percentMatch[1])
    }

    // Try to extract fraction and convert to percentage
    const fractionMatch = this.royalty.match(/(\d+)\/(\d+)/)
    if (fractionMatch) {
      const numerator = parseInt(fractionMatch[1])
      const denominator = parseInt(fractionMatch[2])
      return (numerator / denominator) * 100
    }

    return null
  }

  /**
   * Business logic: Check if royalty is above industry standard
   */
  public isRoyaltyAboveStandard(): boolean {
    const percentage = this.getRoyaltyPercentage()
    return percentage !== null && percentage > 12.5 // 1/8th is standard
  }

  /**
   * Business logic: Get primary lessor (first one listed)
   */
  public getPrimaryLessor(): string {
    return this.lessors.length > 0 ? this.lessors[0] : 'Unknown'
  }

  /**
   * Business logic: Get primary lessee (first one listed)
   */
  public getPrimaryLessee(): string {
    return this.lessees.length > 0 ? this.lessees[0] : 'Unknown'
  }

  /**
   * Business logic: Count total parties involved
   */
  public getTotalParties(): number {
    return this.lessors.length + this.lessees.length
  }

  /**
   * Business logic: Check if this is a complex multi-party agreement
   */
  public isComplexAgreement(): boolean {
    return this.getTotalParties() > 4
  }

  /**
   * Business logic: Get critical insights (potential issues)
   */
  public getCriticalInsights(): string[] {
    return this.insights.filter(insight =>
      insight.toLowerCase().includes('unusual') ||
      insight.toLowerCase().includes('problematic') ||
      insight.toLowerCase().includes('risk') ||
      insight.toLowerCase().includes('concern')
    )
  }

  /**
   * Convert to plain object for serialization (for compatibility with existing code)
   */
  public toPlainObject(): ContractAnalysisResult {
    return {
      lessors: this.lessors,
      lessees: this.lessees,
      acreage: this.acreage,
      depths: this.depths,
      term: this.term,
      royalty: this.royalty,
      insights: this.insights
    }
  }

  /**
   * Factory method to create from plain object (for compatibility)
   */
  public static fromPlainObject(data: ContractAnalysisResult): ContractAnalysis {
    return new ContractAnalysis(
      data.lessors,
      data.lessees,
      data.acreage,
      data.depths,
      data.term,
      data.royalty,
      data.insights
    )
  }

  /**
   * Factory method to create error analysis
   */
  public static createErrorAnalysis(fileName: string, error: string): ContractAnalysis {
    return new ContractAnalysis(
      ['Error in processing'],
      ['Error in processing'],
      'Error in processing',
      'Error in processing',
      'Error in processing',
      'Error in processing',
      [`Failed to process ${fileName}. Please try again or contact support.`, error]
    )
  }
}
