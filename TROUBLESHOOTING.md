# Troubleshooting AWS Services Issues

## Current Status
You can successfully sign in to the application, but contract processing is failing with "Error in processing" messages.

## Most Likely Causes & Solutions

### 1. **AWS Bedrock Model Access** (Most Likely)
**Problem:** Bedrock models require explicit access request
**Solution:**
1. Go to [AWS Bedrock Console](https://console.aws.amazon.com/bedrock/)
2. Navigate to "Model access" in the left sidebar
3. Click "Request model access"
4. Enable access for:
   - `Anthropic Claude 3 Sonnet`
   - `Anthropic Claude 3 Haiku`
5. Wait for approval (can take 24-48 hours)

### 2. **AWS Region Issues**
**Problem:** Services not available in us-east-1
**Check:**
- Verify Textract is available in us-east-1
- Verify Bedrock is available in us-east-1
- Some regions have limited Bedrock availability

### 3. **IAM Permissions**
**Problem:** Cognito Identity Pool role lacks permissions
**Check CDK Stack:** The role should have these permissions:
- `textract:DetectDocumentText`
- `textract:AnalyzeDocument`
- `bedrock:InvokeModel`
- `s3:GetObject`
- `s3:PutObject`

### 4. **CORS/Browser Limitations**
**Problem:** Some AWS services block browser requests
**Note:** Bedrock may not be accessible from browser clients

## Debugging Steps

### Step 1: Check Browser Console
1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Upload a contract file
4. Look for detailed error messages

### Step 2: Test with Text File
1. Create a simple .txt file with contract-like text
2. Upload it to test if Textract is working
3. This bypasses Textract for text files

### Step 3: Check AWS CloudWatch Logs
1. Go to AWS CloudWatch console
2. Look for logs related to:
   - Lambda functions
   - API Gateway
   - Bedrock invocations

## Expected Error Messages

### Bedrock Access Denied
```
Error: AccessDeniedException: You don't have access to the model with the specified model ID.
```
**Solution:** Request model access in Bedrock console

### Region Not Supported
```
Error: The model anthropic.claude-3-sonnet-20240229-v1:0 does not exist or you do not have access to it.
```
**Solution:** Check if Bedrock is available in your region

### Authentication Issues
```
Error: CredentialsError: Missing credentials in config
```
**Solution:** Verify Amplify configuration and Cognito setup

## Temporary Workaround

For immediate testing, you can modify the code to use mock data:

1. In `src/utils/awsServices.ts`, add mock mode
2. Return dummy analysis results
3. This confirms the UI works while AWS services are being set up

## Next Steps

1. **Check Bedrock Access:** This is most likely the issue
2. **Monitor Console Logs:** The improved error handling will show specific issues
3. **Verify Region:** Ensure all services are available in us-east-1
4. **Test Incrementally:** Start with text files, then move to PDFs

## Contact Points

If issues persist:
1. Check AWS Service Health Dashboard
2. Review AWS Bedrock documentation for your region
3. Verify CDK stack deployed successfully
4. Consider using AWS Lambda backend instead of direct browser calls
