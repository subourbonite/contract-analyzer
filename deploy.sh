#!/bin/bash

# Contract Analyzer Deployment Script
# This script deploys the Oil & Gas Contract Analyzer to AWS

set -e  # Exit on any error

echo "🚀 Starting deployment of Contract Analyzer..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if AWS CDK is installed
if ! command -v cdk &> /dev/null; then
    print_error "AWS CDK is not installed. Please install it first: npm install -g aws-cdk"
    exit 1
fi

# Check if Amplify CLI is installed
if ! command -v amplify &> /dev/null; then
    print_warning "Amplify CLI is not installed. Installing..."
    npm install -g @aws-amplify/cli
fi

# Get the current directory
PROJECT_DIR=$(pwd)
INFRASTRUCTURE_DIR="$PROJECT_DIR/infrastructure"

print_status "Project directory: $PROJECT_DIR"

# Step 1: Deploy AWS Infrastructure
print_status "Deploying AWS infrastructure with CDK..."
cd "$INFRASTRUCTURE_DIR"

if [ ! -f "package.json" ]; then
    print_error "CDK package.json not found in infrastructure directory"
    exit 1
fi

# Install CDK dependencies
print_status "Installing CDK dependencies..."
npm install

# Bootstrap CDK (if not already done)
print_status "Bootstrapping CDK..."
cdk bootstrap

# Deploy the stack
print_status "Deploying CDK stack..."
cdk deploy --require-approval never

# Get stack outputs
print_status "Getting stack outputs..."
STACK_OUTPUTS=$(aws cloudformation describe-stacks --stack-name ContractAnalyzerStack --query 'Stacks[0].Outputs' --output json)

if [ -z "$STACK_OUTPUTS" ] || [ "$STACK_OUTPUTS" = "null" ]; then
    print_error "Failed to get stack outputs"
    exit 1
fi

print_success "CDK deployment completed"

# Step 2: Update Amplify configuration with stack outputs
cd "$PROJECT_DIR"
print_status "Updating Amplify configuration..."

# Generate the amplify configuration from stack outputs
node scripts/generate-config.js

print_success "Amplify configuration updated"

# Step 3: Build the application
print_status "Building React application..."
npm run build

if [ $? -eq 0 ]; then
    print_success "Application build completed"
else
    print_error "Application build failed"
    exit 1
fi

# Step 4: Deploy to Amplify
print_status "Setting up Amplify hosting..."

# Check if amplify project is already initialized
if [ -d "amplify" ] && [ -f "amplify/.config/project-config.json" ]; then
    print_status "Amplify project already initialized"

    # Check if hosting is already configured
    if [ -d "amplify/backend/hosting" ]; then
        print_status "Amplify hosting already configured"
    else
        print_status "Adding Amplify hosting..."
        amplify add hosting
        print_status "Pushing hosting configuration..."
        amplify push --yes
    fi
else
    print_status "Initializing new Amplify project..."

    # Initialize Amplify
    amplify init --yes

    # Add hosting
    print_status "Adding Amplify hosting..."
    amplify add hosting

    print_status "Pushing initial configuration..."
    amplify push --yes
fi

# Deploy to Amplify
print_status "Publishing to Amplify..."
amplify publish --yes

print_success "🎉 Deployment completed successfully!"

echo ""
echo "📋 Deployment Summary:"
echo "======================"
echo "✅ AWS Infrastructure deployed via CDK"
echo "✅ React application built successfully"
echo "✅ Application deployed to Amplify"
echo ""
echo "🔗 Your application should be available at the Amplify URL"
echo "🔧 Check the AWS Amplify console for the live URL"
echo ""
echo "📚 Next steps:"
echo "- Test the deployed application"
echo "- Set up custom domain (optional)"
echo "- Configure CI/CD pipeline (optional)"
echo "- Monitor CloudWatch logs"
