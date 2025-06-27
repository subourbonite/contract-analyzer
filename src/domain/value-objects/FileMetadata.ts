/**
 * Value Object: FileMetadata
 * Represents metadata about an uploaded file
 *
 * Following Domain-Driven Design principles:
 * - Immutable
 * - Has no identity (value-based equality)
 * - Encapsulates validation rules
 */
export class FileMetadata {
  constructor(
    public readonly fileName: string,
    public readonly uploadDate: Date,
    public readonly fileSize?: number,
    public readonly mimeType?: string
  ) {
    this.validateFileMetadata()
  }

  /**
   * Business rule: File name must be valid
   */
  private validateFileMetadata(): void {
    if (!this.fileName || this.fileName.trim().length === 0) {
      throw new Error('File name cannot be empty')
    }

    if (this.fileName.length > 255) {
      throw new Error('File name cannot exceed 255 characters')
    }

    if (this.uploadDate > new Date()) {
      throw new Error('Upload date cannot be in the future')
    }

    if (this.fileSize !== undefined && this.fileSize < 0) {
      throw new Error('File size cannot be negative')
    }
  }

  /**
   * Business logic: Get file extension
   */
  public getFileExtension(): string {
    const lastDotIndex = this.fileName.lastIndexOf('.')
    return lastDotIndex > 0 ? this.fileName.substring(lastDotIndex + 1).toLowerCase() : ''
  }

  /**
   * Business logic: Check if file is a supported document type
   */
  public isSupportedDocumentType(): boolean {
    const extension = this.getFileExtension()
    const supportedTypes = ['pdf', 'txt', 'doc', 'docx', 'png', 'jpg', 'jpeg']
    return supportedTypes.includes(extension)
  }

  /**
   * Business logic: Check if file is likely a PDF
   */
  public isPdf(): boolean {
    return this.getFileExtension() === 'pdf' || this.mimeType === 'application/pdf'
  }

  /**
   * Business logic: Check if file is likely a text file
   */
  public isTextFile(): boolean {
    return this.getFileExtension() === 'txt' || this.mimeType === 'text/plain'
  }

  /**
   * Business logic: Check if file is an image
   */
  public isImage(): boolean {
    const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff']
    return imageExtensions.includes(this.getFileExtension()) ||
           (this.mimeType?.startsWith('image/') ?? false)
  }

  /**
   * Value object equality
   */
  public equals(other: FileMetadata): boolean {
    return this.fileName === other.fileName &&
           this.uploadDate.getTime() === other.uploadDate.getTime() &&
           this.fileSize === other.fileSize &&
           this.mimeType === other.mimeType
  }

  /**
   * Generate a unique key for S3 storage
   */
  public generateS3Key(): string {
    const timestamp = this.uploadDate.getTime()
    const cleanFileName = this.fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
    return `contracts/${timestamp}-${cleanFileName}`
  }
}
