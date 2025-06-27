#!/bin/bash

# CDK helper script to handle Node.js version warnings
export JSII_SILENCE_WARNING_UNTESTED_NODE_VERSION=1

echo "🔧 Running CDK command with Node.js warnings silenced..."
echo "Command: cdk $@"
echo ""

npx cdk "$@"
