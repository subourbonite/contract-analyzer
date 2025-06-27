/**
 * Infrastructure Adapter: S3 File Storage
 * Implements file storage operations using AWS S3
 *
 * Following Adapter pattern:
 * - Implements IFileStorage interface from use case
 * - Encapsulates AWS S3 SDK operations
 * - Provides error handling and logging
 */

import { S3Client, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { fetchAuthSession } from 'aws-amplify/auth'
import { IFileStorage } from '../../application/use-cases/DeleteContractUseCase'

export class S3FileStorage implements IFileStorage {
  private s3Client: S3Client | null = null

  constructor(private region: string = 'us-east-1') {}

  /**
   * Get authenticated S3 client
   */
  private async getS3Client(): Promise<S3Client> {
    if (!this.s3Client) {
      const session = await fetchAuthSession()
      this.s3Client = new S3Client({
        region: this.region,
        credentials: session.credentials
      })
    }
    return this.s3Client
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(key: string, bucketName?: string): Promise<void> {
    if (!bucketName) {
      throw new Error('Bucket name is required for S3 operations')
    }

    try {
      const s3Client = await this.getS3Client()
      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key
      })

      await s3Client.send(command)

    } catch (error) {
      throw new Error(`Failed to delete file from S3: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Check if a file exists in S3
   */
  async fileExists(key: string, bucketName?: string): Promise<boolean> {
    if (!bucketName) {
      throw new Error('Bucket name is required for S3 operations')
    }

    try {
      const s3Client = await this.getS3Client()
      const command = new HeadObjectCommand({
        Bucket: bucketName,
        Key: key
      })

      await s3Client.send(command)
      return true

    } catch (error: any) {
      // If error is NotFound, file doesn't exist
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false
      }

      // For other errors, throw them
      throw new Error(`Failed to check file existence in S3: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

/**
 * Mock file storage for testing/development
 */
export class MockFileStorage implements IFileStorage {
  private deletedFiles: Set<string> = new Set()

  async deleteFile(key: string, bucketName?: string): Promise<void> {
    console.log(`[MockFileStorage] Deleting file: ${key} from bucket: ${bucketName}`)
    this.deletedFiles.add(key)

    // Simulate potential S3 errors for testing
    if (key.includes('error')) {
      throw new Error('Simulated S3 deletion error')
    }
  }

  async fileExists(key: string, bucketName?: string): Promise<boolean> {
    console.log(`[MockFileStorage] Checking existence of file: ${key} in bucket: ${bucketName}`)

    // Simulate file existence logic
    // Files that were "deleted" don't exist
    if (this.deletedFiles.has(key)) {
      return false
    }

    // Simulate some files not existing
    if (key.includes('nonexistent')) {
      return false
    }

    return true
  }

  /**
   * Get list of deleted files (for testing purposes)
   */
  getDeletedFiles(): string[] {
    return Array.from(this.deletedFiles)
  }

  /**
   * Reset mock state (for testing purposes)
   */
  reset(): void {
    this.deletedFiles.clear()
  }
}

/**
 * Factory for creating file storage instances
 */
export class FileStorageFactory {
  static create(environment: 'production' | 'development' | 'test'): IFileStorage {
    switch (environment) {
      case 'production':
        return new S3FileStorage()
      case 'development':
        return new S3FileStorage() // Use real S3 in development too
      case 'test':
        return new MockFileStorage()
      default:
        return new MockFileStorage()
    }
  }
}
