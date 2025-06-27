/**
 * Use Case: Delete Contract
 * Orchestrates the business logic for deleting contracts with S3 cleanup
 *
 * Following Clean Architecture principles:
 * - Coordinates between domain services and infrastructure
 * - Handles S3 cleanup when contracts are deleted
 * - Provides error handling and logging
 */

export interface IFileStorage {
  deleteFile(key: string, bucketName?: string): Promise<void>
  fileExists(key: string, bucketName?: string): Promise<boolean>
}

export interface ILogger {
  info(message: string, metadata?: any): void
  error(message: string, error?: Error, metadata?: any): void
  warn(message: string, metadata?: any): void
}

export interface DeleteContractCommand {
  contractId: string
  s3Key?: string
  fileName: string
}

export interface DeleteContractResult {
  success: boolean
  contractId: string
  s3CleanupSuccess: boolean
  errors: string[]
}

export class DeleteContractUseCase {
  constructor(
    private fileStorage: IFileStorage,
    private logger: ILogger,
    private bucketName: string = 'oil-gas-contracts-474668386339-us-east-1'
  ) {}

  /**
   * Execute the use case: delete a contract and clean up associated S3 files
   */
  async execute(command: DeleteContractCommand): Promise<DeleteContractResult> {
    this.logger.info(`Starting contract deletion`, {
      contractId: command.contractId,
      fileName: command.fileName,
      hasS3Key: !!command.s3Key
    })

    const result: DeleteContractResult = {
      success: false,
      contractId: command.contractId,
      s3CleanupSuccess: true,
      errors: []
    }

    try {
      // If contract has an S3 key, attempt to clean up the file
      if (command.s3Key) {
        await this.cleanupS3File(command.s3Key, command.fileName, result)
      }

      // Contract deletion is successful if we reach here
      result.success = true

      this.logger.info(`Successfully deleted contract`, {
        contractId: command.contractId,
        fileName: command.fileName,
        s3CleanupSuccess: result.s3CleanupSuccess
      })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during contract deletion'
      result.errors.push(errorMessage)
      this.logger.error(`Failed to delete contract`, error as Error, {
        contractId: command.contractId,
        fileName: command.fileName
      })
    }

    return result
  }

  /**
   * Clean up S3 file associated with the contract
   */
  private async cleanupS3File(s3Key: string, fileName: string, result: DeleteContractResult): Promise<void> {
    try {
      this.logger.info(`Attempting to cleanup S3 file`, { s3Key, fileName })

      // Check if file exists before attempting deletion
      const fileExists = await this.fileStorage.fileExists(s3Key, this.bucketName)

      if (!fileExists) {
        this.logger.warn(`S3 file not found, skipping cleanup`, { s3Key, fileName })
        return
      }

      // Delete the file from S3
      await this.fileStorage.deleteFile(s3Key, this.bucketName)

      this.logger.info(`Successfully cleaned up S3 file`, { s3Key, fileName })

    } catch (error) {
      result.s3CleanupSuccess = false
      const errorMessage = `Failed to cleanup S3 file: ${error instanceof Error ? error.message : 'Unknown error'}`
      result.errors.push(errorMessage)

      this.logger.error(`S3 cleanup failed`, error as Error, {
        s3Key,
        fileName,
        bucketName: this.bucketName
      })

      // Don't throw here - we want to continue with contract deletion even if S3 cleanup fails
    }
  }
}
