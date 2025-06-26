import { TextractClient, DetectDocumentTextCommand, AnalyzeDocumentCommand } from '@aws-sdk/client-textract'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'

const textractClient = new TextractClient({ region: 'us-east-1' })
const s3Client = new S3Client({ region: 'us-east-1' })
const bedrockClient = new BedrockRuntimeClient({ region: 'us-east-1' })

export const uploadFileToS3 = async (file: File, bucketName: string): Promise<string> => {
  const key = `contracts/${Date.now()}-${file.name}`

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: file,
    ContentType: file.type,
  })

  await s3Client.send(command)
  return key
}

export const extractTextWithTextract = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)

  try {
    const command = new DetectDocumentTextCommand({
      Document: {
        Bytes: bytes,
      },
    })

    const response = await textractClient.send(command)

    if (!response.Blocks) {
      throw new Error('No text blocks found in document')
    }

    // Extract text from LINE blocks
    const textBlocks = response.Blocks.filter(block => block.BlockType === 'LINE')
    const extractedText = textBlocks
      .map(block => block.Text)
      .filter(text => text)
      .join('\\n')

    return extractedText
  } catch (error) {
    console.error('Error extracting text with Textract:', error)
    // Fallback for text files
    if (file.type === 'text/plain') {
      return await file.text()
    }
    throw error
  }
}

export const analyzeContractWithBedrock = async (
  text: string,
  fileName: string
): Promise<{
  lessors: string[]
  lessees: string[]
  acreage: string
  depths: string
  term: string
  royalty: string
  insights: string[]
}> => {
  const prompt = `
Analyze the following oil and gas lease contract text and extract the requested information. Return your analysis in JSON format only, with no additional text or explanation.

Contract text:
${text}

Please extract and return the following information in this exact JSON structure:
{
  "lessors": ["array of lessor names"],
  "lessees": ["array of lessee names"],
  "acreage": "total acreage leased",
  "depths": "depth restrictions or formations leased",
  "term": "lease term duration",
  "royalty": "royalty percentage or fraction",
  "insights": ["array of insights about unusual conditions, terms, or potential impacts"]
}

If any information is not found, use "Not found" as the value. For insights, provide analysis of any unusual terms, conditions, or clauses that differ from standard industry practices, and explain their potential impacts.
`

  try {
    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
      contentType: 'application/json',
      accept: 'application/json',
    })

    const response = await bedrockClient.send(command)

    if (!response.body) {
      throw new Error('No response body from Bedrock')
    }

    const responseBody = JSON.parse(new TextDecoder().decode(response.body))

    // Parse the JSON response from Claude
    let analysisResult
    try {
      // Claude's response is in the 'content' array
      const contentText = responseBody.content[0].text
      analysisResult = JSON.parse(contentText)
    } catch (parseError) {
      console.error('Error parsing Bedrock response:', parseError)
      // Fallback response
      analysisResult = {
        lessors: ['Could not extract from document'],
        lessees: ['Could not extract from document'],
        acreage: 'Could not extract from document',
        depths: 'Could not extract from document',
        term: 'Could not extract from document',
        royalty: 'Could not extract from document',
        insights: ['Analysis could not be completed due to parsing error'],
      }
    }

    return analysisResult
  } catch (error) {
    console.error('Error analyzing contract with Bedrock:', error)

    // Return fallback analysis
    return {
      lessors: ['Analysis unavailable'],
      lessees: ['Analysis unavailable'],
      acreage: 'Analysis unavailable',
      depths: 'Analysis unavailable',
      term: 'Analysis unavailable',
      royalty: 'Analysis unavailable',
      insights: [
        'Contract analysis could not be completed due to service error',
        'Please try again or contact support',
      ],
    }
  }
}
