/**
 * Infrastructure Adapter: AWS Bedrock Contract Analyzer
 * Implements IContractAnalyzer interface using AWS Bedrock service
 *
 * Following Adapter Pattern and Dependency Inversion:
 * - Implements domain-defined interface
 * - Wraps AWS-specific implementation details
 * - Can be easily mocked for testing
 */

import { IContractAnalyzer } from '../../application/use-cases/ProcessContractFilesUseCase'
import { ContractAnalysisResult } from '../../types/contract'

export class BedrockAnalyzer implements IContractAnalyzer {

  async analyzeContract(text: string, fileName: string): Promise<ContractAnalysisResult> {
    try {
      // Import AWS services dynamically to avoid bundling issues
      const { analyzeContractWithBedrock } = await import('../../utils/awsServices')

      // Use existing AWS implementation
      const analysis = await analyzeContractWithBedrock(text, fileName)

      // Apply any domain-specific validation or processing here
      this.validateAnalysisResult(analysis)

      return analysis

    } catch (error) {
      // Transform infrastructure errors into domain-friendly errors and return error analysis
      const message = error instanceof Error ? error.message : 'Unknown analysis error'

      return this.createErrorAnalysis(fileName, message)
    }
  }

  /**
   * Validate that the analysis result has the expected structure
   */
  private validateAnalysisResult(analysis: ContractAnalysisResult): void {
    const requiredFields = ['lessors', 'lessees', 'acreage', 'depths', 'term', 'royalty', 'insights']

    for (const field of requiredFields) {
      if (!(field in analysis)) {
        throw new Error(`Analysis result missing required field: ${field}`)
      }
    }

    // Validate array fields
    if (!Array.isArray(analysis.lessors) || analysis.lessors.length === 0) {
      throw new Error('Analysis result must have at least one lessor')
    }

    if (!Array.isArray(analysis.lessees) || analysis.lessees.length === 0) {
      throw new Error('Analysis result must have at least one lessee')
    }

    if (!Array.isArray(analysis.insights) || analysis.insights.length === 0) {
      throw new Error('Analysis result must have at least one insight')
    }
  }

  /**
   * Create error analysis result following domain rules
   */
  private createErrorAnalysis(fileName: string, errorMessage: string): ContractAnalysisResult {
    return {
      lessors: ['Error in processing'],
      lessees: ['Error in processing'],
      acreage: 'Error in processing',
      depths: 'Error in processing',
      term: 'Error in processing',
      royalty: 'Error in processing',
      insights: [
        `Failed to process ${fileName}. Please try again or contact support.`,
        `Error details: ${errorMessage}`
      ]
    }
  }

  /**
   * Estimate analysis complexity and time
   */
  estimateAnalysisComplexity(text: string): {
    complexity: 'low' | 'medium' | 'high';
    estimatedTime: number;
  } {
    const wordCount = text.split(/\s+/).length

    let complexity: 'low' | 'medium' | 'high' = 'low'
    let estimatedTime = 5000 // 5 seconds base

    if (wordCount < 1000) {
      complexity = 'low'
      estimatedTime = 5000
    } else if (wordCount < 5000) {
      complexity = 'medium'
      estimatedTime = 10000
    } else {
      complexity = 'high'
      estimatedTime = 20000
    }

    // Adjust for complex legal terms
    const complexTerms = [
      'whereas', 'therefore', 'notwithstanding', 'heretofore', 'hereafter',
      'mineral rights', 'pooling', 'unitization', 'force majeure'
    ]

    const complexTermCount = complexTerms.reduce((count, term) => {
      return count + (text.toLowerCase().includes(term) ? 1 : 0)
    }, 0)

    if (complexTermCount > 5) {
      estimatedTime += 5000 // Add 5 seconds for complex legal language
    }

    return { complexity, estimatedTime }
  }
}

/**
 * Mock implementation for testing purposes
 */
export class MockContractAnalyzer implements IContractAnalyzer {
  constructor(private mockResponses: Map<string, ContractAnalysisResult> = new Map()) {}

  async analyzeContract(text: string, fileName: string): Promise<ContractAnalysisResult> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 200))

    // Return mock response if available
    const mockResponse = this.mockResponses.get(fileName)
    if (mockResponse) {
      return mockResponse
    }

    // Generate default mock response based on text content
    return this.generateMockAnalysis(text, fileName)
  }

  /**
   * Generate realistic mock analysis for testing
   */
  private generateMockAnalysis(text: string, fileName: string): ContractAnalysisResult {
    // Extract some basic info from text for more realistic mocks
    const hasAcreage = text.match(/(\d+)\s*acres?/i)
    const hasRoyalty = text.match(/(\d+\/\d+|\d+%|\d+\.\d+)/i)

    return {
      lessors: ['Mock Lessor Company', 'Mock Individual Lessor'],
      lessees: ['Mock Energy Corporation'],
      acreage: hasAcreage ? hasAcreage[0] : '160 acres',
      depths: 'From surface to base of Trinity Formation',
      term: '5 years',
      royalty: hasRoyalty ? hasRoyalty[0] : '1/8th (12.5%)',
      insights: [
        'This is a mock analysis for testing purposes.',
        'Standard lease terms appear to be used.',
        'Royalty rate is within industry standard range.',
        `Analysis generated for file: ${fileName}`
      ]
    }
  }

  /**
   * Add mock response for specific file
   */
  addMockResponse(fileName: string, analysis: ContractAnalysisResult): void {
    this.mockResponses.set(fileName, analysis)
  }

  /**
   * Add mock error for testing error handling
   */
  addMockError(fileName: string, errorMessage: string): void {
    this.mockResponses.set(fileName, {
      lessors: ['Error in processing'],
      lessees: ['Error in processing'],
      acreage: 'Error in processing',
      depths: 'Error in processing',
      term: 'Error in processing',
      royalty: 'Error in processing',
      insights: [`Mock error: ${errorMessage}`]
    })
  }
}

/**
 * Factory for creating contract analyzers based on environment
 */
export class ContractAnalyzerFactory {
  static create(environment: 'production' | 'development' | 'test' = 'production'): IContractAnalyzer {
    switch (environment) {
      case 'test':
        return new MockContractAnalyzer()
      case 'development':
        // Could return a development-specific implementation
        return new BedrockAnalyzer()
      case 'production':
      default:
        return new BedrockAnalyzer()
    }
  }
}
