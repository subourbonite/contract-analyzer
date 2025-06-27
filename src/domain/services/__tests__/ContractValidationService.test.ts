/**
 * Unit Tests: ContractValidationService
 * Tests pure business logic for contract validation
 */

import { ContractValidationService } from '../../../domain/services/ContractValidationService'
import { ContractAnalysisResult } from '../../../types/contract'

describe('ContractValidationService', () => {
  const validAnalysis: ContractAnalysisResult = {
    lessors: ['John Doe', 'Jane Smith'],
    lessees: ['Oil Company Inc.'],
    acreage: '160 acres',
    depths: 'All formations below 500 feet',
    term: '5 years',
    royalty: '12.5%',
    insights: ['Standard lease terms', 'Competitive royalty rate']
  }

  describe('isAnalysisSuccessful', () => {
    it('should return true for valid analysis', () => {
      expect(ContractValidationService.isAnalysisSuccessful(validAnalysis)).toBe(true)
    })

    it('should return false for analysis with processing errors', () => {
      const errorAnalysis: ContractAnalysisResult = {
        ...validAnalysis,
        lessors: ['Error in processing']
      }
      expect(ContractValidationService.isAnalysisSuccessful(errorAnalysis)).toBe(false)
    })

    it('should return false for analysis missing required fields', () => {
      const incompleteAnalysis: ContractAnalysisResult = {
        ...validAnalysis,
        lessors: []
      }
      expect(ContractValidationService.isAnalysisSuccessful(incompleteAnalysis)).toBe(false)
    })
  })

  describe('hasProcessingErrors', () => {
    it('should return false for clean analysis', () => {
      expect(ContractValidationService.hasProcessingErrors(validAnalysis)).toBe(false)
    })

    it('should return true when lessors contain processing errors', () => {
      const errorAnalysis: ContractAnalysisResult = {
        ...validAnalysis,
        lessors: ['Error in processing', 'John Doe']
      }
      expect(ContractValidationService.hasProcessingErrors(errorAnalysis)).toBe(true)
    })

    it('should return true when lessees contain processing errors', () => {
      const errorAnalysis: ContractAnalysisResult = {
        ...validAnalysis,
        lessees: ['Error in processing']
      }
      expect(ContractValidationService.hasProcessingErrors(errorAnalysis)).toBe(true)
    })

    it('should return true when insights contain processing errors', () => {
      const errorAnalysis: ContractAnalysisResult = {
        ...validAnalysis,
        insights: ['Failed to process contract.pdf. Please try again.']
      }
      expect(ContractValidationService.hasProcessingErrors(errorAnalysis)).toBe(true)
    })
  })

  describe('hasRequiredFields', () => {
    it('should return true for complete analysis', () => {
      expect(ContractValidationService.hasRequiredFields(validAnalysis)).toBe(true)
    })

    it('should return false for empty lessors', () => {
      const incompleteAnalysis: ContractAnalysisResult = {
        ...validAnalysis,
        lessors: []
      }
      expect(ContractValidationService.hasRequiredFields(incompleteAnalysis)).toBe(false)
    })

    it('should return false for empty lessees', () => {
      const incompleteAnalysis: ContractAnalysisResult = {
        ...validAnalysis,
        lessees: []
      }
      expect(ContractValidationService.hasRequiredFields(incompleteAnalysis)).toBe(false)
    })

    it('should return false for "Not found" values', () => {
      const incompleteAnalysis: ContractAnalysisResult = {
        ...validAnalysis,
        acreage: 'Not found'
      }
      expect(ContractValidationService.hasRequiredFields(incompleteAnalysis)).toBe(false)
    })

    it('should return false for empty insights', () => {
      const incompleteAnalysis: ContractAnalysisResult = {
        ...validAnalysis,
        insights: []
      }
      expect(ContractValidationService.hasRequiredFields(incompleteAnalysis)).toBe(false)
    })
  })

  describe('validateFileMetadata', () => {
    it('should return valid for acceptable files', () => {
      const result = ContractValidationService.validateFileMetadata('contract.pdf', 1024 * 1024) // 1MB
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should return invalid for empty filename', () => {
      const result = ContractValidationService.validateFileMetadata('', 1024)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('File name cannot be empty')
    })

    it('should return invalid for files that are too large', () => {
      const largeFileSize = 100 * 1024 * 1024 // 100MB
      const result = ContractValidationService.validateFileMetadata('contract.pdf', largeFileSize)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.includes('exceeds maximum allowed size'))).toBe(true)
    })

    it('should return invalid for zero or negative file size', () => {
      const result = ContractValidationService.validateFileMetadata('contract.pdf', 0)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('File size must be greater than 0')
    })

    it('should accumulate multiple validation errors', () => {
      const result = ContractValidationService.validateFileMetadata('', -1)
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('isSupportedFileType', () => {
    it('should support PDF files', () => {
      const result = ContractValidationService.isSupportedFileType('contract.pdf')
      expect(result.isSupported).toBe(true)
      expect(result.fileType).toBe('PDF Document')
    })

    it('should support text files', () => {
      const result = ContractValidationService.isSupportedFileType('document.txt')
      expect(result.isSupported).toBe(true)
      expect(result.fileType).toBe('Text Document')
    })

    it('should support image files', () => {
      const result = ContractValidationService.isSupportedFileType('scan.png')
      expect(result.isSupported).toBe(true)
      expect(result.fileType).toBe('Image')
    })

    it('should not support unsupported file types', () => {
      const result = ContractValidationService.isSupportedFileType('video.mp4')
      expect(result.isSupported).toBe(false)
      expect(result.fileType).toBe('Unknown')
    })

    it('should support files based on MIME type', () => {
      const result = ContractValidationService.isSupportedFileType('unknown.xyz', 'application/pdf')
      expect(result.isSupported).toBe(true)
    })
  })

  describe('getProcessingPriority', () => {
    it('should assign higher priority to text files', () => {
      const textPriority = ContractValidationService.getProcessingPriority('document.txt', 1024)
      const pdfPriority = ContractValidationService.getProcessingPriority('contract.pdf', 1024)
      expect(textPriority).toBeGreaterThan(pdfPriority)
    })

    it('should assign higher priority to smaller files', () => {
      const smallPriority = ContractValidationService.getProcessingPriority('contract.pdf', 500 * 1024) // 500KB
      const largePriority = ContractValidationService.getProcessingPriority('contract.pdf', 25 * 1024 * 1024) // 25MB
      expect(smallPriority).toBeGreaterThan(largePriority)
    })

    it('should return minimum priority of 1', () => {
      const priority = ContractValidationService.getProcessingPriority('huge.tiff', 100 * 1024 * 1024) // 100MB
      expect(priority).toBeGreaterThanOrEqual(1)
    })

    it('should handle unknown file types', () => {
      const priority = ContractValidationService.getProcessingPriority('unknown.xyz', 1024)
      expect(priority).toBeGreaterThanOrEqual(1)
    })
  })
})
