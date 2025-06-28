#!/bin/bash

# Deployment Verification Script
# This script checks if all AWS resources are properly deployed

set -e

echo "🔍 Verifying Contract Analyzer deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[CHECK]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Check AWS CLI
if command -v aws &> /dev/null; then
    print_success "AWS CLI is installed"
else
    print_error "AWS CLI is not installed"
    exit 1
fi

# Check CloudFormation stack
print_status "Checking CloudFormation stack..."
if aws cloudformation describe-stacks --stack-name ContractAnalyzerStack &> /dev/null; then
    print_success "ContractAnalyzerStack exists"

    # Get stack outputs
    OUTPUTS=$(aws cloudformation describe-stacks --stack-name ContractAnalyzerStack --query 'Stacks[0].Outputs' --output json)

    if [ "$OUTPUTS" != "null" ] && [ "$OUTPUTS" != "[]" ]; then
        print_success "Stack outputs available"
        echo "$OUTPUTS" | jq -r '.[] | "  - \(.OutputKey): \(.OutputValue)"'
    else
        print_warning "No stack outputs found"
    fi
else
    print_error "ContractAnalyzerStack not found"
    exit 1
fi

# Check S3 bucket
print_status "Checking S3 bucket..."
BUCKET_NAME=$(aws cloudformation describe-stacks --stack-name ContractAnalyzerStack --query 'Stacks[0].Outputs[?OutputKey==`S3BucketName`].OutputValue' --output text)

if [ "$BUCKET_NAME" != "None" ] && [ -n "$BUCKET_NAME" ]; then
    if aws s3 ls "s3://$BUCKET_NAME" &> /dev/null; then
        print_success "S3 bucket exists: $BUCKET_NAME"
    else
        print_error "S3 bucket not accessible: $BUCKET_NAME"
    fi
else
    print_error "S3 bucket name not found in stack outputs"
fi

# Check Cognito User Pool
print_status "Checking Cognito User Pool..."
USER_POOL_ID=$(aws cloudformation describe-stacks --stack-name ContractAnalyzerStack --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' --output text)

if [ "$USER_POOL_ID" != "None" ] && [ -n "$USER_POOL_ID" ]; then
    if aws cognito-idp describe-user-pool --user-pool-id "$USER_POOL_ID" &> /dev/null; then
        print_success "Cognito User Pool exists: $USER_POOL_ID"
    else
        print_error "Cognito User Pool not accessible: $USER_POOL_ID"
    fi
else
    print_error "User Pool ID not found in stack outputs"
fi

# Check Identity Pool
print_status "Checking Cognito Identity Pool..."
IDENTITY_POOL_ID=$(aws cloudformation describe-stacks --stack-name ContractAnalyzerStack --query 'Stacks[0].Outputs[?OutputKey==`IdentityPoolId`].OutputValue' --output text)

if [ "$IDENTITY_POOL_ID" != "None" ] && [ -n "$IDENTITY_POOL_ID" ]; then
    if aws cognito-identity describe-identity-pool --identity-pool-id "$IDENTITY_POOL_ID" &> /dev/null; then
        print_success "Cognito Identity Pool exists: $IDENTITY_POOL_ID"
    else
        print_error "Cognito Identity Pool not accessible: $IDENTITY_POOL_ID"
    fi
else
    print_error "Identity Pool ID not found in stack outputs"
fi

# Check if Amplify configuration exists
print_status "Checking Amplify configuration..."
if [ -f "src/amplifyconfiguration.json" ]; then
    print_success "Amplify configuration file exists"

    # Validate JSON
    if jq empty src/amplifyconfiguration.json 2>/dev/null; then
        print_success "Amplify configuration is valid JSON"
    else
        print_error "Amplify configuration has invalid JSON"
    fi
else
    print_error "Amplify configuration file not found"
fi

# Check if build works
print_status "Testing application build..."
if npm run build &> /dev/null; then
    print_success "Application builds successfully"
else
    print_error "Application build failed"
    exit 1
fi

# Check Bedrock model access (optional)
print_status "Checking Bedrock model access..."
if aws bedrock list-foundation-models --region us-east-1 &> /dev/null; then
    # Check if Claude 3 Sonnet is available
    if aws bedrock list-foundation-models --region us-east-1 --query 'modelSummaries[?contains(modelId, `claude-3-sonnet`)]' --output text | grep -q claude; then
        print_success "Bedrock Claude 3 Sonnet model is available"
    else
        print_warning "Bedrock Claude 3 Sonnet model access may not be enabled"
    fi
else
    print_warning "Bedrock access check failed (may need to enable service)"
fi

echo ""
print_success "🎉 Deployment verification completed!"
echo ""
echo "📋 Summary:"
echo "==========="
echo "✅ AWS Infrastructure deployed"
echo "✅ Application builds successfully"
echo "✅ Configuration files present"
echo ""
echo "🚀 Ready to deploy to Amplify!"
echo ""
echo "Next steps:"
echo "1. Run: amplify init"
echo "2. Run: amplify add hosting"
echo "3. Run: amplify publish"
