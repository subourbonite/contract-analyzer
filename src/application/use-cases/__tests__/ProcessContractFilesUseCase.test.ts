/**
 * Integration Tests: ProcessContractFilesUseCase
 * Tests the use case with mocked infrastructure dependencies
 */

import { ProcessContractFilesUseCase, ProcessContractFilesUseCaseEnhanced } from '../../../application/use-cases/ProcessContractFilesUseCase'
import { ITextExtractor, IContractAnalyzer, ILogger } from '../../../application/use-cases/ProcessContractFilesUseCase'
import { ContractAnalysisResult } from '../../../types/contract'

// Mock implementations for testing
class MockTextExtractor implements ITextExtractor {
  private shouldThrowError: boolean = false
  private extractedText: string = 'This is a sample oil and gas lease agreement between parties.'

  setShouldThrowError(shouldThrow: boolean): void {
    this.shouldThrowError = shouldThrow
  }

  setExtractedText(text: string): void {
    this.extractedText = text
  }

  async extractText(_file: File): Promise<string> {
    if (this.shouldThrowError) {
      throw new Error('Text extraction failed')
    }
    return this.extractedText
  }
}

class MockContractAnalyzer implements IContractAnalyzer {
  private shouldThrowError: boolean = false
  private analysisResult: ContractAnalysisResult = {
    lessors: ['John Doe'],
    lessees: ['Oil Company Inc.'],
    acreage: '160 acres',
    depths: 'All formations below 500 feet',
    term: '5 years',
    royalty: '12.5%',
    insights: ['Standard lease terms']
  }

  setShouldThrowError(shouldThrow: boolean): void {
    this.shouldThrowError = shouldThrow
  }

  setAnalysisResult(result: ContractAnalysisResult): void {
    this.analysisResult = result
  }

  async analyzeContract(_text: string, _fileName: string): Promise<ContractAnalysisResult> {
    if (this.shouldThrowError) {
      throw new Error('Contract analysis failed')
    }
    return this.analysisResult
  }
}

class MockLogger implements ILogger {
  public logs: Array<{ level: string; message: string; metadata?: any }> = []

  info(message: string, metadata?: any): void {
    this.logs.push({ level: 'info', message, metadata })
  }

  error(message: string, error?: Error, metadata?: any): void {
    this.logs.push({ level: 'error', message, metadata: { error, ...metadata } })
  }

  clear(): void {
    this.logs = []
  }
}

describe('ProcessContractFilesUseCase', () => {
  let useCase: ProcessContractFilesUseCase
  let enhancedUseCase: ProcessContractFilesUseCaseEnhanced
  let mockTextExtractor: MockTextExtractor
  let mockContractAnalyzer: MockContractAnalyzer
  let mockLogger: MockLogger

  beforeEach(() => {
    mockTextExtractor = new MockTextExtractor()
    mockContractAnalyzer = new MockContractAnalyzer()
    mockLogger = new MockLogger()
    useCase = new ProcessContractFilesUseCase(mockTextExtractor, mockContractAnalyzer, mockLogger)
    enhancedUseCase = new ProcessContractFilesUseCaseEnhanced(mockTextExtractor, mockContractAnalyzer, mockLogger)
  })

  const createMockFile = (name: string, content: string, type: string = 'application/pdf'): File => {
    return new File([content], name, { type })
  }

  describe('execute', () => {
    it('should successfully process a single file', async () => {
      const file = createMockFile('contract.pdf', 'contract content')
      const files = [file]

      const result = await useCase.execute(files)

      expect(result).toHaveLength(1)
      expect(result[0].fileName).toBe('contract.pdf')
      expect(result[0].extractedText).toBe('This is a sample oil and gas lease agreement between parties.')
      expect(result[0].analysis.lessors).toEqual(['John Doe'])
      expect(result[0].id).toBeDefined()
      expect(result[0].uploadDate).toBeInstanceOf(Date)
    })

    it('should process multiple files in parallel', async () => {
      const files = [
        createMockFile('contract1.pdf', 'content1'),
        createMockFile('contract2.pdf', 'content2'),
        createMockFile('contract3.pdf', 'content3')
      ]

      const startTime = Date.now()
      const result = await useCase.execute(files)
      const endTime = Date.now()

      expect(result).toHaveLength(3)
      expect(result.map(c => c.fileName)).toEqual(['contract1.pdf', 'contract2.pdf', 'contract3.pdf'])

      // Should complete relatively quickly for parallel processing
      expect(endTime - startTime).toBeLessThan(1000)
    })

    it('should handle text extraction errors gracefully', async () => {
      mockTextExtractor.setShouldThrowError(true)
      const file = createMockFile('contract.pdf', 'content')

      const result = await useCase.execute([file])

      expect(result).toHaveLength(1)
      expect(result[0].extractedText).toContain('Error processing file')
      expect(result[0].analysis.insights[0]).toContain('Failed to process')
      expect(mockLogger.logs.some(log => log.level === 'error')).toBe(true)
    })

    it('should handle contract analysis errors gracefully', async () => {
      mockContractAnalyzer.setShouldThrowError(true)
      const file = createMockFile('contract.pdf', 'content')

      const result = await useCase.execute([file])

      expect(result).toHaveLength(1)
      expect(result[0].analysis.lessors).toEqual(['Error in processing'])
      expect(result[0].analysis.insights[0]).toContain('Failed to process')
      expect(mockLogger.logs.some(log => log.level === 'error')).toBe(true)
    })

    it('should validate files before processing', async () => {
      const invalidFile = createMockFile('', 'content') // Empty filename

      await expect(useCase.execute([invalidFile])).rejects.toThrow('File validation failed')
      expect(mockLogger.logs.some(log =>
        log.level === 'error' && log.message === 'File validation failed'
      )).toBe(true)
    })

    it('should sort files by processing priority', async () => {
      const files = [
        createMockFile('large.pdf', 'content', 'application/pdf'), // Lower priority
        createMockFile('small.txt', 'content', 'text/plain'),      // Higher priority
        createMockFile('medium.png', 'content', 'image/png')       // Medium priority
      ]

      // Mock file sizes to test priority sorting
      Object.defineProperty(files[0], 'size', { value: 25 * 1024 * 1024 }) // 25MB
      Object.defineProperty(files[1], 'size', { value: 1024 }) // 1KB
      Object.defineProperty(files[2], 'size', { value: 5 * 1024 * 1024 }) // 5MB

      const result = await useCase.execute(files)

      // Should process in priority order but return in original order
      expect(result).toHaveLength(3)
      expect(mockLogger.logs.some(log =>
        log.message.includes('Starting to process 3 files')
      )).toBe(true)
    })

    it('should log processing progress', async () => {
      const files = [
        createMockFile('contract1.pdf', 'content1'),
        createMockFile('contract2.pdf', 'content2')
      ]

      await useCase.execute(files)

      expect(mockLogger.logs.some(log =>
        log.message.includes('Starting to process 2 files')
      )).toBe(true)
      expect(mockLogger.logs.some(log =>
        log.message.includes('Successfully processed 2 files')
      )).toBe(true)
    })
  })

  describe('executeWithDetailedResult', () => {
    it('should return detailed processing statistics', async () => {
      const files = [
        createMockFile('contract1.pdf', 'content1'),
        createMockFile('contract2.pdf', 'content2')
      ]

      const result = await enhancedUseCase.executeWithDetailedResult(files)

      expect(result.success).toBe(true)
      expect(result.contracts).toHaveLength(2)
      expect(result.errors).toHaveLength(0)
      expect(result.summary.totalFiles).toBe(2)
      expect(result.summary.successfullyProcessed).toBe(2)
      expect(result.summary.failed).toBe(0)
      expect(result.summary.averageQualityScore).toBeGreaterThan(0)
    })

    it('should handle mixed success and failure scenarios', async () => {
      const files = [
        createMockFile('good.pdf', 'content1'),
        createMockFile('bad.pdf', 'content2')
      ]

      // Make the second file fail text extraction
      let callCount = 0
      mockTextExtractor.extractText = async (_file: File) => {
        callCount++
        if (callCount === 2) {
          throw new Error('Extraction failed')
        }
        return 'This is a sample oil and gas lease agreement between parties.'
      }

      const result = await enhancedUseCase.executeWithDetailedResult(files)

      expect(result.success).toBe(true) // Partial success is still success
      expect(result.contracts).toHaveLength(2)
      expect(result.errors).toHaveLength(1)
      expect(result.summary.successfullyProcessed).toBe(1)
      expect(result.summary.failed).toBe(1)
    })

    it('should calculate quality metrics correctly', async () => {
      // Set up high-quality analysis result
      mockContractAnalyzer.setAnalysisResult({
        lessors: ['John Doe', 'Jane Smith'],
        lessees: ['Premium Oil Company Inc.'],
        acreage: '640 acres',
        depths: 'All formations from surface to 10,000 feet',
        term: '5 years with 3-year extension option',
        royalty: '18.75%',
        insights: [
          'Excellent lease terms with competitive royalty',
          'Clear depth restrictions specified',
          'Well-defined extension clauses'
        ]
      })

      const file = createMockFile('premium-contract.pdf', 'content')
      const result = await enhancedUseCase.executeWithDetailedResult([file])

      expect(result.summary.averageQualityScore).toBeGreaterThan(0.8)
      expect(result.summary.highRiskContracts).toBe(0)
    })
  })
})
