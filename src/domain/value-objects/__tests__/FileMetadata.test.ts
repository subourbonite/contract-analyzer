/**
 * Unit Tests: FileMetadata Value Object
 * Tests pure business logic without external dependencies
 */

import { FileMetadata } from '../../../domain/value-objects/FileMetadata'

describe('FileMetadata', () => {
  const validFileName = 'contract.pdf'
  const validUploadDate = new Date('2025-06-27T10:00:00Z')
  const validFileSize = 1024
  const validMimeType = 'application/pdf'

  describe('constructor validation', () => {
    it('should create valid FileMetadata with required fields', () => {
      const metadata = new FileMetadata(validFileName, validUploadDate)

      expect(metadata.fileName).toBe(validFileName)
      expect(metadata.uploadDate).toBe(validUploadDate)
      expect(metadata.fileSize).toBeUndefined()
      expect(metadata.mimeType).toBeUndefined()
    })

    it('should create valid FileMetadata with all fields', () => {
      const metadata = new FileMetadata(validFileName, validUploadDate, validFileSize, validMimeType)

      expect(metadata.fileName).toBe(validFileName)
      expect(metadata.uploadDate).toBe(validUploadDate)
      expect(metadata.fileSize).toBe(validFileSize)
      expect(metadata.mimeType).toBe(validMimeType)
    })

    it('should throw error for empty file name', () => {
      expect(() => new FileMetadata('', validUploadDate)).toThrow('File name cannot be empty')
      expect(() => new FileMetadata('   ', validUploadDate)).toThrow('File name cannot be empty')
    })

    it('should throw error for file name exceeding 255 characters', () => {
      const longFileName = 'a'.repeat(256) + '.pdf'
      expect(() => new FileMetadata(longFileName, validUploadDate)).toThrow('File name cannot exceed 255 characters')
    })

    it('should throw error for future upload date', () => {
      const futureDate = new Date(Date.now() + 86400000) // Tomorrow
      expect(() => new FileMetadata(validFileName, futureDate)).toThrow('Upload date cannot be in the future')
    })

    it('should throw error for negative file size', () => {
      expect(() => new FileMetadata(validFileName, validUploadDate, -1)).toThrow('File size cannot be negative')
    })
  })

  describe('getFileExtension', () => {
    it('should return correct extension for various file types', () => {
      expect(new FileMetadata('contract.pdf', validUploadDate).getFileExtension()).toBe('pdf')
      expect(new FileMetadata('image.PNG', validUploadDate).getFileExtension()).toBe('png')
      expect(new FileMetadata('document.docx', validUploadDate).getFileExtension()).toBe('docx')
    })

    it('should return empty string for files without extension', () => {
      expect(new FileMetadata('README', validUploadDate).getFileExtension()).toBe('')
    })

    it('should handle files with multiple dots', () => {
      expect(new FileMetadata('file.name.with.dots.pdf', validUploadDate).getFileExtension()).toBe('pdf')
    })

    it('should handle files starting with dot', () => {
      expect(new FileMetadata('.gitignore', validUploadDate).getFileExtension()).toBe('')
      expect(new FileMetadata('.env.local', validUploadDate).getFileExtension()).toBe('local')
    })
  })

  describe('isSupportedDocumentType', () => {
    it('should return true for supported document types', () => {
      expect(new FileMetadata('contract.pdf', validUploadDate).isSupportedDocumentType()).toBe(true)
      expect(new FileMetadata('image.png', validUploadDate).isSupportedDocumentType()).toBe(true)
      expect(new FileMetadata('image.JPG', validUploadDate).isSupportedDocumentType()).toBe(true)
      expect(new FileMetadata('document.txt', validUploadDate).isSupportedDocumentType()).toBe(true)
    })

    it('should return false for unsupported document types', () => {
      expect(new FileMetadata('video.mp4', validUploadDate).isSupportedDocumentType()).toBe(false)
      expect(new FileMetadata('audio.mp3', validUploadDate).isSupportedDocumentType()).toBe(false)
      expect(new FileMetadata('archive.zip', validUploadDate).isSupportedDocumentType()).toBe(false)
    })

    it('should return false for files without extension', () => {
      expect(new FileMetadata('README', validUploadDate).isSupportedDocumentType()).toBe(false)
    })
  })

  describe('isPdf', () => {
    it('should return true for PDF files', () => {
      expect(new FileMetadata('contract.pdf', validUploadDate).isPdf()).toBe(true)
      expect(new FileMetadata('Contract.PDF', validUploadDate).isPdf()).toBe(true)
      expect(new FileMetadata('file.txt', validUploadDate, undefined, 'application/pdf').isPdf()).toBe(true)
    })

    it('should return false for non-PDF files', () => {
      expect(new FileMetadata('image.png', validUploadDate).isPdf()).toBe(false)
      expect(new FileMetadata('document.txt', validUploadDate).isPdf()).toBe(false)
    })
  })

  describe('isTextFile', () => {
    it('should return true for text files', () => {
      expect(new FileMetadata('document.txt', validUploadDate).isTextFile()).toBe(true)
      expect(new FileMetadata('file.pdf', validUploadDate, undefined, 'text/plain').isTextFile()).toBe(true)
    })

    it('should return false for non-text files', () => {
      expect(new FileMetadata('contract.pdf', validUploadDate).isTextFile()).toBe(false)
      expect(new FileMetadata('image.png', validUploadDate).isTextFile()).toBe(false)
    })
  })

  describe('isImage', () => {
    it('should return true for image files', () => {
      expect(new FileMetadata('photo.png', validUploadDate).isImage()).toBe(true)
      expect(new FileMetadata('scan.JPG', validUploadDate).isImage()).toBe(true)
      expect(new FileMetadata('file.txt', validUploadDate, undefined, 'image/jpeg').isImage()).toBe(true)
    })

    it('should return false for non-image files', () => {
      expect(new FileMetadata('contract.pdf', validUploadDate).isImage()).toBe(false)
      expect(new FileMetadata('document.txt', validUploadDate).isImage()).toBe(false)
    })
  })

  describe('generateS3Key', () => {
    it('should generate unique S3 keys', () => {
      const metadata = new FileMetadata(validFileName, validUploadDate)
      const s3Key = metadata.generateS3Key()

      expect(s3Key).toMatch(/^contracts\/\d+-contract\.pdf$/)
      expect(s3Key).toContain('contracts/')
      expect(s3Key).toContain(validUploadDate.getTime().toString())
    })

    it('should clean special characters from file names', () => {
      const specialFileName = 'my file with spaces & symbols!.pdf'
      const metadata = new FileMetadata(specialFileName, validUploadDate)
      const s3Key = metadata.generateS3Key()

      expect(s3Key).toMatch(/^contracts\/\d+-my_file_with_spaces___symbols_\.pdf$/)
    })
  })

  describe('equals', () => {
    it('should return true for identical file metadata', () => {
      const metadata1 = new FileMetadata(validFileName, validUploadDate, validFileSize, validMimeType)
      const metadata2 = new FileMetadata(validFileName, validUploadDate, validFileSize, validMimeType)

      expect(metadata1.equals(metadata2)).toBe(true)
    })

    it('should return false for different file names', () => {
      const metadata1 = new FileMetadata('file1.pdf', validUploadDate)
      const metadata2 = new FileMetadata('file2.pdf', validUploadDate)

      expect(metadata1.equals(metadata2)).toBe(false)
    })

    it('should return false for different upload dates', () => {
      const date1 = new Date('2025-06-27T10:00:00Z')
      const date2 = new Date('2025-06-27T11:00:00Z')
      const metadata1 = new FileMetadata(validFileName, date1)
      const metadata2 = new FileMetadata(validFileName, date2)

      expect(metadata1.equals(metadata2)).toBe(false)
    })

    it('should return false for different file sizes', () => {
      const metadata1 = new FileMetadata(validFileName, validUploadDate, 1024)
      const metadata2 = new FileMetadata(validFileName, validUploadDate, 2048)

      expect(metadata1.equals(metadata2)).toBe(false)
    })
  })
})
