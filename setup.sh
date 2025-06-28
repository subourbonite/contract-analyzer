#!/bin/bash

# Oil & Gas Lease Contract Analyzer - Setup Script
# This script helps set up the development environment

echo "🔧 Setting up Oil & Gas Lease Contract Analyzer..."

# Check if required tools are installed
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 is not installed. Please install it first."
        exit 1
    else
        echo "✅ $1 is installed"
    fi
}

echo "📋 Checking prerequisites..."
check_command "node"
check_command "npm"
check_command "aws"

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ $NODE_VERSION -lt 18 ]; then
    echo "❌ Node.js version 18 or higher is required. Current version: $(node --version)"
    exit 1
else
    echo "✅ Node.js version is compatible: $(node --version)"
fi

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
npm install

# Install infrastructure dependencies
echo "📦 Installing infrastructure dependencies..."
cd infrastructure
npm install
cd ..

echo "🏗️ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Configure AWS CLI: aws configure"
echo "2. Deploy infrastructure: cd infrastructure && npm run cdk:deploy"
echo "3. Update src/amplifyconfiguration.json with CDK outputs"
echo "4. Start development server: npm run dev"
echo ""
echo "📖 See README.md for detailed instructions"
