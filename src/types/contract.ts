export interface ContractAnalysisResult {
  lessors: string[]
  lessees: string[]
  acreage: string
  depths: string
  term: string
  royalty: string
  insights: string[]
}

export interface ContractData {
  id: string
  fileName: string
  uploadDate: Date
  extractedText: string
  analysis: ContractAnalysisResult
  s3Key?: string // Optional S3 key for cleanup
}
