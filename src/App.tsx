import React, { useState, useCallback } from 'react'
import { useAuthenticator } from '@aws-amplify/ui-react'
import { FileUpload } from './components/FileUpload'
import { ContractAnalysis } from './components/ContractAnalysis'
import { Header } from './components/Header'
import { ContractData } from './types/contract'

function App() {
  const { signOut, user } = useAuthenticator()
  const [contracts, setContracts] = useState<ContractData[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const handleFilesUploaded = useCallback(async (files: File[]) => {
    setIsAnalyzing(true)
    try {
      // Process files and analyze contracts
      const newContracts = await processContractFiles(files)
      setContracts(prev => [...prev, ...newContracts])
    } catch (error) {
      console.error('Error processing contracts:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }, [])

  const processContractFiles = async (files: File[]): Promise<ContractData[]> => {
    const { extractTextWithTextract, analyzeContractWithBedrock } = await import('./utils/awsServices')
    const processedContracts: ContractData[] = []

    for (const file of files) {
      try {
        // Extract text using AWS Textract
        const extractedText = await extractTextWithTextract(file)

        // Analyze with AWS Bedrock
        const analysis = await analyzeContractWithBedrock(extractedText, file.name)

        processedContracts.push({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          fileName: file.name,
          uploadDate: new Date(),
          extractedText,
          analysis
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
          }
        })
      }
    }

    return processedContracts
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} onSignOut={signOut} />

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
              onDeleteContract={(id) => setContracts(prev => prev.filter(c => c.id !== id))}
            />
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
