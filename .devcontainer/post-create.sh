#!/bin/bash

# Post-create setup script for the dev container
echo "🚀 Setting up Contract Analyzer development environment..."

# Update package lists
sudo apt-get update

# Install additional system dependencies
echo "📦 Installing system dependencies..."
sudo apt-get install -y \
    python3-pip \
    jq \
    zip \
    unzip \
    curl \
    wget \
    git

# Install AWS CDK CLI globally
echo "🔧 CDK CLI already installed in Dockerfile..."

# Install AWS Amplify CLI globally  
echo "🔧 Amplify CLI already installed in Dockerfile..."

# Install project dependencies
echo "📚 Installing project dependencies..."
npm install

# Install infrastructure dependencies
echo "🏗️ Installing infrastructure dependencies..."
cd infrastructure && npm install && cd ..

# Set up git configuration (will use the host's git config if mounted)
echo "⚙️ Configuring development environment..."

# Create additional useful aliases (main aliases already set in Dockerfile)
echo "alias cdk-diff='cd infrastructure && npm run cdk:diff && cd ..'" >> ~/.bashrc

# Source the updated bashrc
source ~/.bashrc

# Display versions of installed tools
echo "🎉 Development environment setup complete!"
echo ""
echo "Installed tool versions:"
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo "TypeScript: $(npx tsc --version)"
echo "AWS CLI: $(aws --version 2>/dev/null || echo 'AWS CLI installed but version check failed (architecture mismatch)')"
echo "AWS CDK: $(cdk --version)"
echo "Amplify CLI: $(amplify --version)"
echo ""
echo "🚀 Ready for development! Run 'npm run dev' to start the development server."
