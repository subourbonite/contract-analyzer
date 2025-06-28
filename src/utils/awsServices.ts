import { TextractClient, DetectDocumentTextCommand, StartDocumentTextDetectionCommand, GetDocumentTextDetectionCommand } from '@aws-sdk/client-textract'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import { fetchAuthSession } from 'aws-amplify/auth'

// Function to get AWS credentials from Amplify
const getAWSCredentials = async () => {
  const session = await fetchAuthSession()
  return session.credentials
}

// Function to create authenticated AWS clients
const createAWSClients = async () => {
  const credentials = await getAWSCredentials()

  return {
    textractClient: new TextractClient({
      region: 'us-east-1',
      credentials
    }),
    s3Client: new S3Client({
      region: 'us-east-1',
      credentials
    }),
    bedrockClient: new BedrockRuntimeClient({
      region: 'us-east-1',
      credentials
    })
  }
}

export const uploadFileToS3 = async (file: File, bucketName: string): Promise<string> => {
  const { s3Client } = await createAWSClients()
  const key = `contracts/${Date.now()}-${file.name}`

  console.log('Uploading file to S3:', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    bucket: bucketName,
    key: key
  })

  try {
    // Convert File to ArrayBuffer, then to Uint8Array for S3 upload
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = new Uint8Array(arrayBuffer)

    console.log('File converted to buffer:', {
      originalSize: file.size,
      bufferLength: fileBuffer.length
    })

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: fileBuffer,
      ContentType: file.type,
    })

    const result = await s3Client.send(command)
    console.log('S3 upload successful:', {
      key: key,
      eTag: result.ETag,
      versionId: result.VersionId
    })

    // Track the uploaded S3 key for contract cleanup
    setLastUploadedS3Key(key)

    return key
  } catch (error) {
    console.error('S3 upload failed:', error)
    console.error('Upload error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    throw error
  }
}

export const extractTextWithTextract = async (file: File): Promise<string> => {
  try {
    console.log('Starting text extraction for file:', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    })

    // For text files, use direct reading
    if (file.type === 'text/plain') {
      console.log('Processing text file directly')
      return await file.text()
    }

    // For PDFs, try S3-based approach first due to common Textract PDF issues
    if (file.type === 'application/pdf') {
      console.log('PDF detected - attempting S3-based processing')
      try {
        return await extractTextFromPDFViaS3(file)
      } catch (s3Error) {
        console.error('S3-based PDF processing failed, trying direct bytes fallback:', s3Error)

        // If S3 fails, try direct bytes as fallback
        if (file.size < 5 * 1024 * 1024) { // 5MB threshold
          console.log('Attempting direct bytes fallback for PDF...')
          return await extractTextDirectBytes(file)
        } else {
          console.error('PDF too large for direct bytes fallback')
          throw s3Error
        }
      }
    }

    // For images, use direct byte processing
    return await extractTextDirectBytes(file)

  } catch (error) {
    console.error('Error in extractTextWithTextract:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to extract text from ${file.name}: ${errorMessage}`)
  }
}

// Direct byte processing for images (and PDF fallback)
const extractTextDirectBytes = async (file: File): Promise<string> => {
  const { textractClient } = await createAWSClients()

  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)

  console.log('Processing file with direct bytes:', {
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    bytesLength: bytes.length,
    processingMethod: 'DetectDocumentTextCommand (synchronous)'
  })

  // Note: DetectDocumentTextCommand might not work well with PDFs
  // It's primarily designed for images
  if (file.type === 'application/pdf') {
    console.warn('WARNING: Using DetectDocumentTextCommand for PDF - this may not extract all text!')
    console.warn('PDFs often require asynchronous processing via S3 for full text extraction')
  }

  const command = new DetectDocumentTextCommand({
    Document: {
      Bytes: bytes,
    },
  })

  try {
    const response = await textractClient.send(command)

    if (!response.Blocks) {
      throw new Error('No text blocks found in document')
    }

    console.log(`Textract found ${response.Blocks.length} blocks`)

    // Extract text from LINE blocks
    const textBlocks = response.Blocks.filter((block: any) => block.BlockType === 'LINE')
    const extractedText = textBlocks
      .map((block: any) => block.Text)
      .filter((text: any) => text)
      .join('\n')

    console.log('=== DIRECT BYTES TEXTRACT EXTRACTION RESULT ===')
    console.log('Total blocks:', response.Blocks.length)
    console.log('Number of LINE blocks:', textBlocks.length)
    console.log('Extracted text length:', extractedText.length)
    console.log('First 500 chars:', extractedText.substring(0, 500))
    console.log('Last 500 chars:', extractedText.substring(Math.max(0, extractedText.length - 500)))
    console.log('Full extracted text:', extractedText)
    console.log('=== END DIRECT BYTES EXTRACTION RESULT ===')

    return extractedText
  } catch (error) {
    console.error('Direct bytes processing failed:', error)
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      code: (error as any)?.Code || 'Unknown code'
    })
    throw error
  }
}

// S3-based asynchronous processing for PDFs
const extractTextFromPDFViaS3 = async (file: File): Promise<string> => {
  const { textractClient } = await createAWSClients()

  try {
    // First upload to S3
    console.log('Uploading PDF to S3 for Textract processing...')
    const bucketName = 'oil-gas-contracts-474668386339-us-east-1' // From your config
    const s3Key = await uploadFileToS3(file, bucketName)

    console.log('PDF uploaded to S3, starting asynchronous Textract processing...')
    console.log('⏱️  Large PDFs may take 1-3 minutes to process completely - please be patient!')

    // Start asynchronous text detection
    const startCommand = new StartDocumentTextDetectionCommand({
      DocumentLocation: {
        S3Object: {
          Bucket: bucketName,
          Name: s3Key,
        },
      },
    })

    console.log('Starting Textract job with parameters:', {
      bucket: bucketName,
      s3Key: s3Key,
      fullS3Path: `s3://${bucketName}/${s3Key}`
    })

    const startResponse = await textractClient.send(startCommand)
    const jobId = startResponse.JobId

    console.log('Textract StartDocumentTextDetection response:', {
      jobId: jobId,
      responseMetadata: startResponse.$metadata
    })

    if (!jobId) {
      throw new Error('Failed to start Textract job - no JobId received')
    }

    console.log(`Textract job started with ID: ${jobId}`)

    // Poll for completion
    let jobStatus = 'IN_PROGRESS'
    let attempts = 0
    const maxAttempts = 100 // 100 attempts with 3-second intervals = 5 minutes max
    const pollIntervalMs = 3000 // 3 seconds between polls

    console.log(`Polling configuration: ${maxAttempts} attempts, ${pollIntervalMs/1000}s intervals, max ${(maxAttempts * pollIntervalMs) / 1000}s (${((maxAttempts * pollIntervalMs) / 1000 / 60).toFixed(1)} minutes)`)

    while (jobStatus === 'IN_PROGRESS' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs))

      const getCommand = new GetDocumentTextDetectionCommand({
        JobId: jobId,
      })

      let getResponse: any = null
      try {
        getResponse = await textractClient.send(getCommand)
        jobStatus = getResponse?.JobStatus || 'UNKNOWN'

        console.log(`Textract job status: ${jobStatus} (attempt ${attempts + 1}/${maxAttempts}, elapsed: ${((attempts + 1) * pollIntervalMs) / 1000}s)`)

        // Log additional response details for debugging
        if (attempts === 0 || attempts % 10 === 0) {
          console.log('Detailed Textract response:', {
            jobId: jobId,
            jobStatus: jobStatus,
            statusMessage: getResponse?.StatusMessage,
            nextToken: getResponse?.NextToken,
            responseMetadata: getResponse?.$metadata
          })
        }

        // Provide progress updates at key intervals
        if ((attempts + 1) === 10) {
          console.log('📄 Still processing document - this is normal for large or complex PDFs...')
        } else if ((attempts + 1) === 20) {
          console.log('📄 Document processing continues - please be patient for large files...')
        } else if ((attempts + 1) === 40) {
          console.log('📄 Processing taking longer than usual - this may be a complex document...')
        } else if ((attempts + 1) === 60) {
          console.log('📄 Still processing after 3 minutes - image-based PDFs can take longer...')
        } else if ((attempts + 1) === 80) {
          console.log('📄 Processing continues after 4 minutes - almost at timeout limit...')
        }
      } catch (pollError) {
        console.error(`Error polling Textract job status (attempt ${attempts + 1}):`, pollError)
        // Continue polling unless it's a critical error
        if ((pollError as any)?.name === 'InvalidJobIdException') {
          throw new Error(`Textract job ${jobId} is invalid or expired`)
        }
        // For other errors, continue polling
        jobStatus = 'POLLING_ERROR'
      }

      if (jobStatus === 'SUCCEEDED' && getResponse) {
        if (!getResponse.Blocks) {
          throw new Error('No text blocks found in document')
        }

        console.log(`Textract found ${getResponse.Blocks.length} blocks from async PDF processing`)

        // Check if there are multiple pages of results
        let allBlocks = [...getResponse.Blocks]
        let nextToken = getResponse.NextToken

        while (nextToken) {
          console.log('Fetching next page of Textract results...')
          const nextCommand = new GetDocumentTextDetectionCommand({
            JobId: jobId,
            NextToken: nextToken,
          })

          const nextResponse = await textractClient.send(nextCommand)
          if (nextResponse.Blocks) {
            allBlocks = [...allBlocks, ...nextResponse.Blocks]
            console.log(`Added ${nextResponse.Blocks.length} more blocks, total: ${allBlocks.length}`)
          }
          nextToken = nextResponse.NextToken
        }

        console.log(`Final total blocks from all pages: ${allBlocks.length}`)

        // Extract text from LINE blocks
        const textBlocks = allBlocks.filter((block: any) => block.BlockType === 'LINE')
        const extractedText = textBlocks
          .map((block: any) => block.Text)
          .filter((text: any) => text)
          .join('\n')

        console.log('=== ASYNC PDF TEXTRACT EXTRACTION RESULT ===')
        console.log('Total blocks from async processing:', allBlocks.length)
        console.log('Number of LINE blocks:', textBlocks.length)
        console.log('Extracted text length:', extractedText.length)
        console.log('First 500 chars:', extractedText.substring(0, 500))
        console.log('Last 500 chars:', extractedText.substring(Math.max(0, extractedText.length - 500)))
        console.log('Full extracted text from async PDF:', extractedText)
        console.log('=== END ASYNC PDF EXTRACTION RESULT ===')

        return extractedText
      } else if (jobStatus === 'FAILED') {
        throw new Error(`Textract job failed: ${getResponse.StatusMessage || 'Unknown error'}`)
      }

      attempts++
    }

    // If we reach here, the job timed out
    throw new Error(`Textract job timed out after ${maxAttempts} attempts (${(maxAttempts * pollIntervalMs) / 1000} seconds / ${((maxAttempts * pollIntervalMs) / 1000 / 60).toFixed(1)} minutes)`)

  } catch (error) {
    console.error('Async S3-based PDF processing failed:', error)
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })

    // Rethrow the error to be handled by the main extraction function
    throw error
  }
}

export const analyzeContractWithBedrock = async (
  text: string,
  _fileName: string
): Promise<{
  lessors: string[]
  lessees: string[]
  acreage: string
  depths: string
  term: string
  royalty: string
  insights: string[]
}> => {
  const { bedrockClient } = await createAWSClients()

  // Log the text being sent to Bedrock for analysis
  console.log('=== BEDROCK ANALYSIS START ===')
  console.log('Using model: Claude 4 Sonnet (us.anthropic.claude-sonnet-4-20250514-v1:0 inference profile)')
  console.log('Text length:', text.length)
  console.log('First 500 characters of text:', text.substring(0, 500))
  console.log('Last 500 characters of text:', text.substring(Math.max(0, text.length - 500)))
  console.log('Full text being analyzed:', text)
  console.log('=== END TEXT PREVIEW ===')

  const prompt = `
You are a senior oil and gas attorney with 20+ years of experience reviewing lease agreements. You specialize in mineral rights, royalty structures, and identifying problematic lease terms that could impact landowner rights or operator obligations.

Your analysis will be reviewed by oil & gas attorneys, landmen, petroleum engineers, and other industry professionals who need detailed, technically accurate information to make informed decisions about lease terms and potential risks.

IMPORTANT: You must return ONLY valid JSON with no additional text, explanations, or markdown formatting. Do not wrap the JSON in code blocks or backticks.

Analyze the following oil and gas lease contract text and extract the requested information with your expert legal perspective, tailored for professional industry use:

Contract text:
${text}

Return ONLY the following JSON structure with no additional text:
{
  "lessors": ["array of lessor names"],
  "lessees": ["array of lessee names"],
  "acreage": "total acreage leased",
  "depths": "depth restrictions or formations leased (e.g., 'from surface to 1000 feet below base of Trinity Sand', 'all depths')",
  "term": "primary lease term and any extension provisions",
  "royalty": "royalty percentage or fraction (e.g., '1/8th', '12.5%', '3/16th')",
  "insights": [
    "Professional-grade analysis for oil & gas attorneys and industry professionals, focusing on:",
    "- Royalty structures: unusual deductions, post-production costs, and market enhancement clauses",
    "- Depth/formation issues: severance problems, conflicting descriptions, or ambiguous boundaries",
    "- Lease duration: primary term length, extension mechanisms, and continuous drilling obligations",
    "- Surface rights: access restrictions, damage compensation, and restoration requirements",
    "- Pooling/unitization: voluntary vs. forced pooling provisions and acreage limitations",
    "- Assignment rights: consent requirements, preferential rights, and transfer restrictions",
    "- Operational clauses: drilling obligations, shut-in provisions, and force majeure terms",
    "- Legal risks: ambiguous language, conflicting provisions, or terms that could lead to disputes",
    "- Industry standard deviations: terms that differ from typical Texas Railroad Commission or industry practices"
  ]
}

For your professional audience, include:
- Specific legal citations or standard references where applicable
- Technical terminology that industry professionals would recognize
- Risk assessments that attorneys can use for client advisement
- Operational implications that landmen and engineers need to consider
- Regulatory compliance issues relevant to oil & gas operations

As an expert addressing other professionals, pay special attention to:
- Royalty deductions and post-production costs that could affect revenue calculations
- Depth severance language that could impact drilling rights and responsibilities
- Surface use provisions that could affect operational planning and liability
- Shut-in royalty and continuous drilling terms that could affect lease maintenance
- Force majeure clauses and their potential impact during market volatility
- Assignment and transfer provisions that could affect corporate transactions

If any information is not found, use "Not found" as the value. Provide insights that enable informed legal and business decision-making.

REMEMBER: Return ONLY valid JSON. No markdown, no explanations, no code blocks.`

  try {
    const command = new InvokeModelCommand({
      modelId: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
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
    }    return analysisResult
  } catch (error) {
    console.error('Error analyzing contract with Bedrock:', error)
    console.error('Bedrock error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })

    // Return fallback analysis with more specific error info
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return {
      lessors: ['Service unavailable'],
      lessees: ['Service unavailable'],
      acreage: 'Service unavailable',
      depths: 'Service unavailable',
      term: 'Service unavailable',
      royalty: 'Service unavailable',
      insights: [
        `Contract analysis failed: ${errorMessage}`,
        'This may be due to AWS Bedrock model access not being enabled.',
        'Please check AWS Bedrock console for model access permissions.',
      ],
    }
  }
}

export const extractTextWithSmartFallback = async (file: File): Promise<string> => {
  try {
    console.log('🎯 Attempting primary extraction with Textract...')

    // Try Textract first (higher quality)
    const textractResult = await extractTextWithTextract(file)

    // Validate result quality
    if (textractResult.length > 50 && !textractResult.includes('Failed to extract')) {
      console.log('✅ Textract extraction successful')
      return textractResult
    }

    throw new Error('Textract result quality insufficient')

  } catch (textractError) {
    const textractMessage = textractError instanceof Error ? textractError.message : 'Unknown error'
    console.warn('⚠️ Textract failed, attempting Tesseract fallback:', textractError)

    try {
      // Fallback to client-side Tesseract for smaller files
      if (file.size < 2 * 1024 * 1024) { // 2MB limit for client-side
        console.log('🔄 Using Tesseract fallback for small file...')
        // Would implement Tesseract here
        return `Fallback extraction attempted for ${file.name}`
      } else {
        throw new Error('File too large for client-side fallback')
      }
    } catch (tesseractError) {
      const tesseractMessage = tesseractError instanceof Error ? tesseractError.message : 'Unknown error'
      console.error('❌ Both extraction methods failed')
      throw new Error(`Extraction failed: Textract (${textractMessage}), Tesseract (${tesseractMessage})`)
    }
  }
}

export const deleteFileFromS3 = async (key: string, bucketName: string): Promise<void> => {
  const { s3Client } = await createAWSClients()

  console.log('Deleting file from S3:', {
    bucket: bucketName,
    key: key
  })

  try {
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key
    })

    await s3Client.send(command)
    console.log('S3 file deletion successful:', key)
  } catch (error) {
    console.error('S3 file deletion failed:', error)
    console.error('Delete error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      key: key,
      bucket: bucketName
    })
    // Don't throw error for cleanup operations - log and continue
  }
}

// Track the last uploaded S3 key for contract cleanup
let lastUploadedS3Key: string | undefined = undefined

export const getLastUploadedS3Key = (): string | undefined => {
  const key = lastUploadedS3Key
  lastUploadedS3Key = undefined // Clear after getting
  return key
}

const setLastUploadedS3Key = (key: string) => {
  lastUploadedS3Key = key
}
