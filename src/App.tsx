import { useState, useCallback, useEffect } from 'react'
import { useAuthenticator } from '@aws-amplify/ui-react'
import { fetchUserAttributes } from 'aws-amplify/auth'
import { FileUpload } from './components/FileUpload'
import { ContractAnalysis } from './components/ContractAnalysis'
import { Header } from './components/Header'
import { ContractData } from './types/contract'
import { createEnhancedContractProcessingUseCase, createDeleteContractUseCase } from './infrastructure/ServiceContainer'

function App() {
  const { signOut, user } = useAuthenticator()
  const [contracts, setContracts] = useState<ContractData[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [userAttributes, setUserAttributes] = useState<any>(null)

  // Fetch user attributes on component mount
  useEffect(() => {
    const getUserAttributes = async () => {
      try {
        const attributes = await fetchUserAttributes()
        console.log('Fetched user attributes:', attributes)
        setUserAttributes(attributes)
      } catch (error) {
        console.log('Error fetching user attributes:', error)
      }
    }

    if (user) {
      getUserAttributes()
    }
  }, [user])

  const handleFilesUploaded = useCallback(async (files: File[]) => {
    setIsAnalyzing(true)
    console.log('Processing files:', files.map(f => f.name))
    try {
      // Use the new clean architecture use case
      const useCase = createEnhancedContractProcessingUseCase(
        process.env.NODE_ENV === 'production' ? 'production' : 'development'
      )

      const result = await useCase.executeWithDetailedResult(files)

      if (result.errors.length > 0) {
        console.warn('Some files had processing errors:', result.errors)
      }

      setContracts(prev => [...prev, ...result.contracts])
      console.log('Successfully processed contracts:', result.summary.successfullyProcessed)

      if (result.summary.failed > 0) {
        alert(`${result.summary.failed} files failed to process. Check console for details.`)
      }
    } catch (error) {
      console.error('Error processing contracts:', error)
      alert('Error processing contracts. Please check the browser console for details.')
    } finally {
      setIsAnalyzing(false)
    }
  }, [])

  const handleDeleteContract = async (id: string) => {
    const contract = contracts.find(c => c.id === id)
    if (!contract) {
      console.error('Contract not found for deletion:', id)
      return
    }

    try {
      // Use the new clean architecture use case for contract deletion
      const deleteUseCase = createDeleteContractUseCase(
        process.env.NODE_ENV === 'production' ? 'production' : 'development'
      )

      const result = await deleteUseCase.execute({
        contractId: contract.id,
        s3Key: contract.s3Key,
        fileName: contract.fileName
      })

      if (result.success) {
        setContracts(prev => prev.filter(c => c.id !== id))
        console.log(`Successfully deleted contract: ${contract.fileName}`)

        if (!result.s3CleanupSuccess && result.errors.length > 0) {
          console.warn('Contract deleted but S3 cleanup had issues:', result.errors)
        }
      } else {
        console.error('Failed to delete contract:', result.errors)
        alert(`Failed to delete contract: ${result.errors.join(', ')}`)
      }
    } catch (error) {
      console.error('Error deleting contract:', error)
      alert('Error deleting contract. Please check the browser console for details.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={{ ...user, fetchedAttributes: userAttributes }} onSignOut={signOut} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Oil & Gas Lease Analyzer
          </h1>
          <p className="text-gray-600">
            Upload and analyze oil and gas lease contracts to extract key terms and identify unusual conditions.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <FileUpload
              onFilesUploaded={handleFilesUploaded}
              isAnalyzing={isAnalyzing}
            />
          </div>

          <div className="lg:col-span-2">
            <ContractAnalysis
              contracts={contracts}
              onDeleteContract={handleDeleteContract}
            />
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
