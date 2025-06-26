# Oil & Gas Lease Contract Analyzer

A modern React application built with TypeScript for analyzing oil and gas lease contracts using AWS services.

## Features

- **User Authentication**: Secure sign-in using AWS Cognito
- **File Upload**: Drag-and-drop interface supporting multiple file formats:
  - Text files (.txt)
  - Word documents (.doc, .docx)
  - PDFs (text and image-based)
  - Images (PNG, JPG, etc.)
- **Text Extraction**: Automated text extraction using AWS Textract
- **AI Analysis**: Contract analysis powered by AWS Bedrock
- **Data Extraction**: Automatically extracts:
  - Lessor(s) names
  - Lessee(s) names
  - Acreage details
  - Depth/formation information
  - Lease term duration
  - Royalty percentages
- **Insights Generation**: AI-powered analysis of unusual contract conditions
- **PDF Export**: Download analysis results as PDF for offline storage

## Architecture

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Vite** for fast development and building
- **AWS Amplify UI React** for authentication components

### Backend Services
- **AWS Cognito** for user authentication and authorization
- **AWS S3** for secure file storage
- **AWS Textract** for text extraction from documents and images
- **AWS Bedrock** with Claude 3 for contract analysis
- **AWS API Gateway** and Lambda for serverless processing

### Infrastructure
- **AWS CDK** for Infrastructure as Code
- Automated deployment to AWS Amplify

## Getting Started

### Prerequisites
- Node.js 18+ 
- AWS Account with appropriate permissions
- AWS CLI configured

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd contract-analyzer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Deploy AWS Infrastructure**
   ```bash
   cd infrastructure
   npm install
   npm run cdk:deploy
   ```

4. **Update Amplify Configuration**
   After CDK deployment, update `src/amplifyconfiguration.json` with the outputs from the CDK stack.

5. **Start Development Server**
   ```bash
   npm run dev
   ```

### Deployment

#### Deploy Infrastructure
```bash
cd infrastructure
npm run cdk:deploy
```

#### Deploy Frontend to Amplify
```bash
npm run build
# Deploy to AWS Amplify (configure hosting in AWS Console)
```

## Usage

1. **Sign In**: Create an account or sign in using the Cognito authentication
2. **Upload Contracts**: Drag and drop contract files or click to browse
3. **View Analysis**: Review extracted contract terms in an easy-to-read table format
4. **Read Insights**: Examine AI-generated insights about unusual contract conditions
5. **Export Results**: Download analysis as PDF for offline reference

## AWS Services Configuration

### Required AWS Services
- **Cognito**: User pools and identity pools configured
- **S3**: Bucket with CORS enabled for file uploads
- **Textract**: Enable document text detection and analysis
- **Bedrock**: Access to Claude 3 models (anthropic.claude-3-sonnet-20240229-v1:0)
- **IAM**: Proper roles and policies for service access

### Permissions
The application requires the following AWS permissions:
- `textract:DetectDocumentText`
- `textract:AnalyzeDocument`
- `bedrock:InvokeModel`
- `s3:GetObject`
- `s3:PutObject`

## Development

### Scripts
- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run preview`: Preview production build
- `npm run lint`: Run ESLint

### Project Structure
```
src/
├── components/          # React components
│   ├── Header.tsx
│   ├── FileUpload.tsx
│   └── ContractAnalysis.tsx
├── types/              # TypeScript type definitions
│   └── contract.ts
├── utils/              # Utility functions
│   └── awsServices.ts
├── App.tsx             # Main application component
├── main.tsx           # Application entry point
└── index.css          # Global styles

infrastructure/         # AWS CDK infrastructure code
├── lib/
│   └── contract-analyzer-stack.ts
├── bin/
│   └── contract-analyzer.ts
└── cdk.json
```

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify Cognito configuration in `amplifyconfiguration.json`
   - Check user pool and identity pool settings

2. **File Upload Issues**
   - Ensure S3 bucket CORS is properly configured
   - Verify IAM permissions for authenticated users

3. **Text Extraction Failures**
   - Check Textract service availability in your region
   - Verify file formats are supported

4. **Analysis Errors**
   - Ensure Bedrock service is enabled in your region
   - Verify access to Claude 3 models

### Support
For support and issues, please check the AWS documentation for each service used:
- [AWS Amplify Documentation](https://docs.amplify.aws/)
- [AWS Textract Documentation](https://docs.aws.amazon.com/textract/)
- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)

## License

This project is licensed under the MIT License.
