import { useState, useCallback, useEffect } from 'react'
import { useAuthenticator } from '@aws-amplify/ui-react'
import { fetchUserAttributes } from 'aws-amplify/auth'
import { FileUpload } from './components/FileUpload'
import { ContractAnalysis } from './components/ContractAnalysis'
import { Header } from './components/Header'
import { ContractData } from './types/contract'

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
      // Process files and analyze contracts
      const newContracts = await processContractFiles(files)
      setContracts(prev => [...prev, ...newContracts])
      console.log('Successfully processed contracts:', newContracts.length)
    } catch (error) {
      console.error('Error processing contracts:', error)
      alert('Error processing contracts. Please check the browser console for details.')
    } finally {
      setIsAnalyzing(false)
    }
  }, [])

  const processContractFiles = async (files: File[]): Promise<ContractData[]> => {
    const { extractTextWithTextract, analyzeContractWithBedrock, getLastUploadedS3Key } = await import('./utils/awsServices')
    const processedContracts: ContractData[] = []

    for (const file of files) {
      let s3Key: string | undefined = undefined
      try {
        // Extract text using AWS Textract (may upload to S3)
        const extractedText = await extractTextWithTextract(file)

        // For PDFs and potentially other file types, check if an S3 upload happened
        // by getting the last uploaded S3 key (this will be set if S3 upload occurred)
        s3Key = getLastUploadedS3Key()

        // Analyze with AWS Bedrock
        const analysis = await analyzeContractWithBedrock(extractedText, file.name)

        processedContracts.push({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          fileName: file.name,
          uploadDate: new Date(),
          extractedText,
          analysis,
          s3Key
        })
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error)
        // Add contract with error status
        processedContracts.push({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          fileName: file.name,
          uploadDate: new Date(),
          extractedText: `Error processing file: ${error instanceof Error ? error.message : 'Unknown error'}`,
          analysis: {
            lessors: ['Error in processing'],
            lessees: ['Error in processing'],
            acreage: 'Error in processing',
            depths: 'Error in processing',
            term: 'Error in processing',
            royalty: 'Error in processing',
            insights: [`Failed to process ${file.name}. Please try again or contact support.`]
          },
          s3Key
        })
      }
    }

    return processedContracts
  }

  const handleDeleteContract = async (id: string) => {
    const contract = contracts.find(c => c.id === id)
    if (contract?.s3Key) {
      try {
        const { deleteFileFromS3 } = await import('./utils/awsServices')
        const bucketName = 'oil-gas-contracts-474668386339-us-east-1'
        await deleteFileFromS3(contract.s3Key, bucketName)
        console.log(`Cleaned up S3 file: ${contract.s3Key}`)
      } catch (error) {
        console.error('Failed to cleanup S3 file:', error)
        // Continue with contract deletion even if S3 cleanup fails
      }
    }
    setContracts(prev => prev.filter(c => c.id !== id))
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
