#!/bin/bash

# Amplify Deployment Fix Script
# This script ensures the correct distribution directory is used

echo "🔧 Fixing Amplify deployment configuration..."

# Ensure we're in the project directory
cd "$(dirname "$0")"

# Make sure we have a clean build
echo "Building application..."
npm run build

# Check if dist directory exists
if [ ! -d "dist" ]; then
    echo "❌ Error: dist directory not found. Build may have failed."
    exit 1
fi

# Update Amplify configuration to use dist directory
echo "Updating Amplify project configuration..."
if [ -f "amplify/.config/project-config.json" ]; then
    # Use jq to update the configuration if available, otherwise use sed
    if command -v jq &> /dev/null; then
        jq '.javascript.config.DistributionDir = "dist" | .javascript.config.BuildCommand = "npm run build" | .javascript.config.StartCommand = "npm run dev"' amplify/.config/project-config.json > amplify/.config/project-config.json.tmp
        mv amplify/.config/project-config.json.tmp amplify/.config/project-config.json
        echo "✅ Updated project configuration using jq"
    else
        # Fallback to sed
        sed -i.bak 's/"DistributionDir": "build"/"DistributionDir": "dist"/' amplify/.config/project-config.json
        sed -i.bak 's/"BuildCommand": "npm run-script build"/"BuildCommand": "npm run build"/' amplify/.config/project-config.json
        sed -i.bak 's/"StartCommand": "npm run-script start"/"StartCommand": "npm run dev"/' amplify/.config/project-config.json
        rm amplify/.config/project-config.json.bak 2>/dev/null || true
        echo "✅ Updated project configuration using sed"
    fi
else
    echo "❌ Error: Amplify project configuration not found"
    exit 1
fi

# Verify the dist directory has content
if [ ! -f "dist/index.html" ]; then
    echo "❌ Error: dist/index.html not found. Build may be incomplete."
    exit 1
fi

echo "✅ Build artifacts verified"
echo "📁 Distribution directory: dist"
echo "📄 Files in dist:"
ls -la dist/

# Try to publish
echo "🚀 Publishing to Amplify..."
amplify publish --yes

echo "✅ Deployment script completed!"
