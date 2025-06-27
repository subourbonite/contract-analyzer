#!/bin/bash

# Frontend-only Deployment Script
# Use this when you only want to update the React application without touching AWS infrastructure

set -e

echo "🎨 Deploying frontend changes..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Amplify is initialized
if [ ! -d "amplify" ] || [ ! -f "amplify/.config/project-config.json" ]; then
    print_error "Amplify project not initialized. Please run ./deploy.sh first."
    exit 1
fi

# Build the application
print_status "Building React application..."
npm run build

if [ $? -eq 0 ]; then
    print_success "Application build completed"
else
    print_error "Application build failed"
    exit 1
fi

# Deploy to Amplify
print_status "Publishing frontend to Amplify..."
amplify publish --yes

print_success "🎉 Frontend deployment completed!"
echo "🔗 Check the AWS Amplify console for the live URL"
