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
echo "🔧 Installing AWS CDK CLI..."
npm install -g aws-cdk@2.87.0

# Install AWS Amplify CLI globally
echo "🔧 Installing AWS Amplify CLI..."
npm install -g @aws-amplify/cli

# Install project dependencies
echo "📚 Installing project dependencies..."
npm install

# Install infrastructure dependencies
echo "🏗️ Installing infrastructure dependencies..."
cd infrastructure && npm install && cd ..

# Set up git configuration (will use the host's git config if mounted)
echo "⚙️ Configuring development environment..."

# Create useful aliases
echo "alias ll='ls -la'" >> ~/.bashrc
echo "alias la='ls -A'" >> ~/.bashrc
echo "alias l='ls -CF'" >> ~/.bashrc
echo "alias ..='cd ..'" >> ~/.bashrc
echo "alias ...='cd ../..'" >> ~/.bashrc
echo "alias grep='grep --color=auto'" >> ~/.bashrc

# CDK and AWS specific aliases
echo "alias cdk-deploy='cd infrastructure && npm run cdk:deploy && cd ..'" >> ~/.bashrc
echo "alias cdk-destroy='cd infrastructure && npm run cdk:destroy && cd ..'" >> ~/.bashrc
echo "alias cdk-diff='cd infrastructure && npm run cdk:diff && cd ..'" >> ~/.bashrc
echo "alias dev='npm run dev'" >> ~/.bashrc

# Source the updated bashrc
source ~/.bashrc

# Display versions of installed tools
echo "🎉 Development environment setup complete!"
echo ""
echo "Installed tool versions:"
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo "TypeScript: $(npx tsc --version)"
echo "AWS CLI: $(aws --version)"
echo "AWS CDK: $(cdk --version)"
echo "Amplify CLI: $(amplify --version)"
echo ""
echo "🚀 Ready for development! Run 'npm run dev' to start the development server."
