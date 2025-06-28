# Deployment Guide

This guide covers deploying the Oil & Gas Contract Analyzer to AWS using AWS Amplify and AWS CDK.

## Prerequisites

Before deploying, ensure you have:

1. **AWS CLI** installed and configured with appropriate credentials
2. **AWS CDK** installed globally: `npm install -g aws-cdk`
3. **Amplify CLI** installed globally: `npm install -g @aws-amplify/cli`
4. **Node.js** (version 18 or higher)
5. **AWS Account** with appropriate permissions for:
   - Amazon Cognito
   - Amazon S3
   - Amazon Textract
   - Amazon Bedrock
   - AWS Lambda
   - API Gateway
   - CloudFormation
   - Amplify

## Quick Deployment

### Option 1: Automated Deployment (Recommended)

Run the automated deployment script:

```bash
./deploy.sh
```

This script will:
1. Deploy AWS infrastructure using CDK
2. Update Amplify configuration
3. Build the React application
4. Deploy to Amplify hosting

### Option 2: Manual Deployment

#### Step 1: Deploy AWS Infrastructure

```bash
cd infrastructure
npm install
cdk bootstrap
cdk deploy
```

#### Step 2: Update Configuration

```bash
cd ..
node scripts/generate-config.js
```

#### Step 3: Initialize Amplify (first time only)

```bash
amplify init
```

Follow the prompts:
- Enter a name for the project: `contract-analyzer`
- Enter a name for the environment: `production`
- Choose your default editor: `Visual Studio Code`
- Choose the type of app: `javascript`
- Framework: `react`
- Source Directory Path: `src`
- Distribution Directory Path: `dist`
- Build Command: `npm run build`
- Start Command: `npm run dev`

#### Step 4: Add Hosting

```bash
amplify add hosting
```

Choose:
- Select the plugin module: `Hosting with Amplify Console`
- Choose a type: `Manual deployment`

#### Step 5: Build and Deploy

```bash
npm run build
amplify publish
```

## Post-Deployment Configuration

### 1. Verify AWS Services

After deployment, verify that all AWS services are working:

1. **Cognito**: Check user pool and identity pool are created
2. **S3**: Verify the bucket exists and has correct permissions
3. **Textract**: Ensure the service is accessible in your region
4. **Bedrock**: Verify model access is enabled for Claude 3 Sonnet

### 2. Enable Bedrock Model Access

If not already done, enable model access in AWS Bedrock:

1. Go to AWS Bedrock console
2. Navigate to "Model access" in the left sidebar
3. Click "Enable specific models"
4. Enable "Claude 3 Sonnet" by Anthropic
5. Submit the request (may take a few minutes)

### 3. Test the Application

1. Visit the Amplify URL provided after deployment
2. Sign up for a new account
3. Upload a test PDF contract
4. Verify text extraction and analysis work correctly

## Environment Variables

The application uses these environment variables (automatically configured):

- `VITE_REGION`: AWS region (us-east-1)
- `VITE_USER_POOL_ID`: Cognito User Pool ID
- `VITE_USER_POOL_CLIENT_ID`: Cognito User Pool Client ID
- `VITE_IDENTITY_POOL_ID`: Cognito Identity Pool ID
- `VITE_S3_BUCKET`: S3 bucket name for file storage

## Custom Domain (Optional)

To set up a custom domain:

1. In Amplify Console, go to your app
2. Click "Domain management"
3. Add your domain
4. Follow the DNS configuration steps

## CI/CD Pipeline (Optional)

To set up continuous deployment:

1. Connect your Git repository to Amplify
2. Configure build settings
3. Set up branch-based deployments

## Monitoring and Troubleshooting

### CloudWatch Logs

Monitor application logs in CloudWatch:
- Lambda function logs
- Amplify build logs
- Application runtime logs

### Common Issues

1. **Bedrock Access Denied**: Ensure model access is enabled
2. **Textract Limits**: Check service quotas and limits
3. **S3 Permissions**: Verify IAM roles have correct permissions
4. **CORS Issues**: Check API Gateway CORS configuration

### Debugging

Enable detailed logging by setting:
```javascript
// In browser console
localStorage.setItem('debug', 'true')
```

## Costs

Estimated monthly costs for moderate usage:
- Amplify Hosting: ~$1-5
- Cognito: ~$0-10 (depending on users)
- S3: ~$1-5 (depending on storage)
- Textract: ~$1-50 (depending on documents processed)
- Bedrock: ~$5-100 (depending on analysis volume)
- Lambda: ~$0-5

## Security

The application implements:
- User authentication via Cognito
- Secure file upload to S3
- IAM roles with least privilege
- Encrypted data transmission
- Secure API endpoints

## Scaling

For high-volume usage, consider:
- Implementing file processing queues
- Adding CDN for faster content delivery
- Optimizing Lambda functions
- Setting up database for analytics

## Alternative Deployment Methods

### Using Amplify Console (Git-based)

1. Push your code to GitHub/GitLab/Bitbucket
2. Go to AWS Amplify Console
3. Connect your repository
4. Configure build settings:
   - Build command: `npm run build`
   - Output directory: `dist`
5. Deploy automatically on every push

### Using AWS CLI for S3 + CloudFront

```bash
# Build the app
npm run build

# Create S3 bucket for hosting
aws s3 mb s3://your-app-bucket-name

# Enable static website hosting
aws s3 website s3://your-app-bucket-name --index-document index.html

# Upload files
aws s3 sync dist/ s3://your-app-bucket-name --delete

# Create CloudFront distribution (optional, for CDN)
# Use AWS Console or CDK for this
```

## Support

For issues or questions:
1. Check CloudWatch logs
2. Review AWS service quotas
3. Verify IAM permissions
4. Test with smaller files first

## Next Steps After Deployment

1. **Monitor Usage**: Set up CloudWatch alarms for cost monitoring
2. **Backup Strategy**: Configure S3 versioning and backup policies
3. **Performance Optimization**: Monitor and optimize based on usage patterns
4. **User Feedback**: Collect user feedback and iterate on features
5. **Documentation**: Keep deployment and user documentation updated
