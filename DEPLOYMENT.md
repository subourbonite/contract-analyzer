# Deployment Guide

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** configured with credentials
3. **Node.js 18+** installed
4. **CDK CLI** installed globally: `npm install -g aws-cdk`

## Step-by-Step Deployment

### 1. Initial Setup

```bash
# Clone and setup the project
git clone <your-repo-url>
cd contract-analyzer
chmod +x setup.sh
./setup.sh
```

### 2. Configure AWS Services

#### Enable Required AWS Services
Make sure the following services are enabled in your AWS account:
- AWS Cognito
- AWS S3
- AWS Textract
- AWS Bedrock (with Claude 3 model access)
- AWS Lambda
- AWS API Gateway

#### Request Bedrock Model Access
1. Go to AWS Bedrock console
2. Navigate to "Model access" 
3. Request access to:
   - Anthropic Claude 3 Sonnet
   - Anthropic Claude 3 Haiku
   - Amazon Titan Text Express

### 3. Deploy Infrastructure

```bash
# Navigate to infrastructure directory
cd infrastructure

# Bootstrap CDK (only needed once per account/region)
npx cdk bootstrap

# Deploy the stack
npm run cdk:deploy
```

**Note the outputs** from the CDK deployment - you'll need these values.

### 4. Configure Frontend

Update `src/amplifyconfiguration.json` with the values from CDK deployment:

```json
{
  "aws_project_region": "us-east-1",
  "aws_cognito_identity_pool_id": "[IdentityPoolId from CDK output]",
  "aws_cognito_region": "us-east-1", 
  "aws_user_pools_id": "[UserPoolId from CDK output]",
  "aws_user_pools_web_client_id": "[UserPoolClientId from CDK output]",
  "oauth": {},
  "aws_cognito_username_attributes": ["email"],
  "aws_cognito_social_providers": [],
  "aws_cognito_signup_attributes": ["email"],
  "aws_cognito_mfa_configuration": "OFF",
  "aws_cognito_mfa_types": ["SMS"],
  "aws_cognito_password_protection_settings": {
    "passwordPolicyMinLength": 8,
    "passwordPolicyCharacters": []
  },
  "aws_cognito_verification_mechanisms": ["email"],
  "aws_user_files_s3_bucket": "[ContractsBucketName from CDK output]",
  "aws_user_files_s3_bucket_region": "us-east-1"
}
```

### 5. Test Locally

```bash
# Start development server
npm run dev
```

Visit http://localhost:3000 to test the application.

### 6. Deploy to Production

#### Option A: AWS Amplify Hosting

1. **Create Amplify App**
   ```bash
   # Initialize Amplify
   npx @aws-amplify/cli init
   ```

2. **Add Hosting**
   ```bash
   npx @aws-amplify/cli add hosting
   ```

3. **Deploy**
   ```bash
   npx @aws-amplify/cli publish
   ```

#### Option B: Manual S3 + CloudFront

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Upload to S3**
   ```bash
   aws s3 sync dist/ s3://your-website-bucket --delete
   ```

3. **Configure CloudFront** (optional, for CDN)

### 7. Post-Deployment Configuration

#### Set up CORS for S3 Bucket
The CDK stack should handle this automatically, but verify CORS is configured:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "POST", "PUT", "DELETE"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```

#### Configure Cognito User Pool
1. Go to AWS Cognito console
2. Select your user pool
3. Configure any additional settings as needed

### 8. Monitoring and Logging

#### CloudWatch Logs
- Lambda function logs: `/aws/lambda/ContractAnalyzerStack-ContractProcessor`
- API Gateway logs: Enable in API Gateway console

#### CloudWatch Metrics
Monitor:
- Lambda function duration and errors
- API Gateway requests and latency
- Textract usage
- Bedrock model invocations

## Troubleshooting

### Common Issues

1. **CDK Deployment Fails**
   - Check AWS credentials and permissions
   - Ensure CDK is bootstrapped: `npx cdk bootstrap`
   - Verify region is supported for all services

2. **Bedrock Access Denied**
   - Request model access in Bedrock console
   - Wait for approval (can take 24-48 hours)
   - Verify IAM permissions include Bedrock actions

3. **File Upload Issues**
   - Check S3 bucket CORS configuration
   - Verify IAM roles have S3 permissions
   - Check file size limits (default 50MB)

4. **Authentication Problems**
   - Verify Cognito configuration in amplifyconfiguration.json
   - Check user pool settings
   - Ensure identity pool has authenticated role attached

### Useful Commands

```bash
# View CDK stack resources
npx cdk list

# See what changes will be made
npx cdk diff

# Destroy stack (careful!)
npx cdk destroy

# View CloudFormation template
npx cdk synth
```

## Security Considerations

1. **API Security**
   - API Gateway endpoints are protected by Cognito authentication
   - IAM roles follow principle of least privilege

2. **Data Protection**
   - S3 bucket has encryption enabled
   - Files are uploaded with user-specific prefixes

3. **Network Security**
   - HTTPS enforced for all endpoints
   - CORS properly configured

## Cost Optimization

1. **S3 Lifecycle Policies**
   - Consider setting up lifecycle rules to archive old files
   - Use S3 Intelligent-Tiering for cost optimization

2. **Lambda Optimization**
   - Monitor function memory usage and adjust
   - Consider provisioned concurrency for production

3. **Bedrock Usage**
   - Monitor token usage for cost management
   - Consider using smaller models for simpler analyses

## Support

For deployment issues, check:
1. AWS CloudFormation console for stack events
2. CloudWatch logs for error details
3. AWS service documentation for each service used
