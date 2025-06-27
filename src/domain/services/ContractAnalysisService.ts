/**
 * Domain Service: ContractAnalysisService
 * Contains pure business logic for analyzing contract terms and extracting insights
 *
 * Following Functional Core principles:
 * - Pure functions with no side effects
 * - Business rules for contract analysis
 * - Independent of AI/ML implementation details
 */

import { ContractAnalysisResult } from '../../types/contract'

export class ContractAnalysisService {
  /**
   * Business rule: Extract royalty percentage as number
   */
  static extractRoyaltyPercentage(royaltyString: string): number | null {
    if (!royaltyString || royaltyString.includes('Error in processing')) {
      return null
    }

    // Try to extract percentage from royalty string (e.g., "12.5%")
    const percentMatch = royaltyString.match(/(\d+(?:\.\d+)?)\s*%/)
    if (percentMatch) {
      return parseFloat(percentMatch[1])
    }

    // Try to extract fraction and convert to percentage (e.g., "1/8")
    const fractionMatch = royaltyString.match(/(\d+)\/(\d+)/)
    if (fractionMatch) {
      const numerator = parseInt(fractionMatch[1], 10)
      const denominator = parseInt(fractionMatch[2], 10)
      if (denominator !== 0) {
        return (numerator / denominator) * 100
      }
    }

    // Try to extract decimal and convert to percentage (e.g., "0.125")
    const decimalMatch = royaltyString.match(/0\.(\d+)/)
    if (decimalMatch) {
      const decimal = parseFloat(`0.${decimalMatch[1]}`)
      return decimal * 100
    }

    return null
  }

  /**
   * Business rule: Check if royalty is above industry standard
   */
  static isRoyaltyAboveStandard(royaltyString: string): boolean {
    const percentage = this.extractRoyaltyPercentage(royaltyString)
    return percentage !== null && percentage > 12.5 // 1/8th (12.5%) is standard
  }

  /**
   * Business rule: Check if royalty is below market rate
   */
  static isRoyaltyBelowMarket(royaltyString: string): boolean {
    const percentage = this.extractRoyaltyPercentage(royaltyString)
    return percentage !== null && percentage < 10.0 // Below 10% is typically low
  }

  /**
   * Business rule: Extract numeric value from acreage string
   */
  static extractAcreageNumber(acreageString: string): number | null {
    if (!acreageString || acreageString.includes('Error in processing')) {
      return null
    }

    // Match patterns like "160 acres", "160.5 acres", "160"
    const acreageMatch = acreageString.match(/(\d+(?:\.\d+)?)\s*(?:acres?)?/i)
    if (acreageMatch) {
      return parseFloat(acreageMatch[1])
    }

    return null
  }

  /**
   * Business rule: Classify contract size based on acreage
   */
  static classifyContractSize(acreageString: string): 'small' | 'medium' | 'large' | 'unknown' {
    const acreage = this.extractAcreageNumber(acreageString)

    if (acreage === null) {
      return 'unknown'
    }

    if (acreage < 50) {
      return 'small'
    } else if (acreage < 500) {
      return 'medium'
    } else {
      return 'large'
    }
  }

  /**
   * Business rule: Extract lease term duration in years
   */
  static extractTermYears(termString: string): number | null {
    if (!termString || termString.includes('Error in processing')) {
      return null
    }

    // Match patterns like "5 years", "3 year", "10-year"
    const yearMatch = termString.match(/(\d+)[-\s]*years?/i)
    if (yearMatch) {
      return parseInt(yearMatch[1], 10)
    }

    return null
  }

  /**
   * Business rule: Check if lease term is standard duration
   */
  static isStandardTerm(termString: string): boolean {
    const years = this.extractTermYears(termString)
    // Standard oil & gas lease terms are typically 3-5 years
    return years !== null && years >= 3 && years <= 5
  }

  /**
   * Business rule: Count total parties in the contract
   */
  static getTotalParties(lessors: string[], lessees: string[]): number {
    // Filter out error messages
    const validLessors = lessors.filter(l => !l.includes('Error in processing'))
    const validLessees = lessees.filter(l => !l.includes('Error in processing'))

    return validLessors.length + validLessees.length
  }

  /**
   * Business rule: Check if this is a complex multi-party agreement
   */
  static isComplexAgreement(lessors: string[], lessees: string[]): boolean {
    return this.getTotalParties(lessors, lessees) > 4
  }

  /**
   * Business rule: Get critical insights (potential issues or concerns)
   */
  static getCriticalInsights(insights: string[]): string[] {
    const criticalKeywords = [
      'unusual', 'problematic', 'risk', 'concern', 'warning',
      'issue', 'potential problem', 'non-standard', 'deviation',
      'conflict', 'ambiguous', 'unclear'
    ]

    return insights.filter(insight => {
      const lowerInsight = insight.toLowerCase()
      return criticalKeywords.some(keyword => lowerInsight.includes(keyword))
    })
  }

  /**
   * Business rule: Generate contract risk score (0-100, higher = more risky)
   */
  static calculateRiskScore(analysis: ContractAnalysisResult): number {
    let riskScore = 0

    // Risk factors
    const royaltyPercentage = this.extractRoyaltyPercentage(analysis.royalty)

    // Low royalty increases risk
    if (royaltyPercentage !== null && royaltyPercentage < 10) {
      riskScore += 20
    }

    // Very high royalty might indicate other unfavorable terms
    if (royaltyPercentage !== null && royaltyPercentage > 20) {
      riskScore += 10
    }

    // Complex agreements have higher risk
    if (this.isComplexAgreement(analysis.lessors, analysis.lessees)) {
      riskScore += 15
    }

    // Non-standard terms increase risk
    if (!this.isStandardTerm(analysis.term)) {
      riskScore += 10
    }

    // Critical insights indicate risk
    const criticalInsights = this.getCriticalInsights(analysis.insights)
    riskScore += Math.min(criticalInsights.length * 5, 25) // Max 25 points for insights

    // Large acreage might indicate complexity
    const acreage = this.extractAcreageNumber(analysis.acreage)
    if (acreage !== null && acreage > 1000) {
      riskScore += 10
    }

    // Cap at 100
    return Math.min(riskScore, 100)
  }

  /**
   * Business rule: Generate contract quality score (0-100, higher = better quality)
   */
  static calculateQualityScore(analysis: ContractAnalysisResult): number {
    let qualityScore = 100

    // Deduct points for missing or poor quality data
    if (analysis.lessors.some(l => l.includes('Error in processing'))) {
      qualityScore -= 20
    }

    if (analysis.lessees.some(l => l.includes('Error in processing'))) {
      qualityScore -= 20
    }

    if (analysis.acreage === 'Not found' || analysis.acreage.includes('Error')) {
      qualityScore -= 15
    }

    if (analysis.depths === 'Not found' || analysis.depths.includes('Error')) {
      qualityScore -= 10
    }

    if (analysis.term === 'Not found' || analysis.term.includes('Error')) {
      qualityScore -= 15
    }

    if (analysis.royalty === 'Not found' || analysis.royalty.includes('Error')) {
      qualityScore -= 20
    }

    // Bonus points for comprehensive insights
    if (analysis.insights.length > 5) {
      qualityScore += 10
    }

    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(qualityScore, 100))
  }

  /**
   * Business rule: Generate summary statistics for a contract
   */
  static generateContractSummary(analysis: ContractAnalysisResult): {
    primaryLessor: string;
    primaryLessee: string;
    royaltyPercentage: number | null;
    termYears: number | null;
    acreageNumber: number | null;
    contractSize: 'small' | 'medium' | 'large' | 'unknown';
    riskScore: number;
    qualityScore: number;
    isComplex: boolean;
    criticalIssuesCount: number;
  } {
    return {
      primaryLessor: analysis.lessors.length > 0 ? analysis.lessors[0] : 'Unknown',
      primaryLessee: analysis.lessees.length > 0 ? analysis.lessees[0] : 'Unknown',
      royaltyPercentage: this.extractRoyaltyPercentage(analysis.royalty),
      termYears: this.extractTermYears(analysis.term),
      acreageNumber: this.extractAcreageNumber(analysis.acreage),
      contractSize: this.classifyContractSize(analysis.acreage),
      riskScore: this.calculateRiskScore(analysis),
      qualityScore: this.calculateQualityScore(analysis),
      isComplex: this.isComplexAgreement(analysis.lessors, analysis.lessees),
      criticalIssuesCount: this.getCriticalInsights(analysis.insights).length
    }
  }
}
