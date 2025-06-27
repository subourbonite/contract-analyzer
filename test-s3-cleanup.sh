#!/bin/bash

# Test S3 cleanup functionality
echo "Testing S3 cleanup functionality..."

# Check current S3 bucket contents
echo "Current S3 objects in contracts bucket:"
aws s3 ls s3://oil-gas-contracts-474668386339-us-east-1/contracts/ --recursive

echo ""
echo "Upload a test file to S3 to verify cleanup works:"
echo "test content" > test-contract.txt
aws s3 cp test-contract.txt s3://oil-gas-contracts-474668386339-us-east-1/contracts/test-$(date +%s)-test-contract.txt

echo ""
echo "S3 contents after test upload:"
aws s3 ls s3://oil-gas-contracts-474668386339-us-east-1/contracts/ --recursive

# Clean up test file
rm -f test-contract.txt

echo ""
echo "Test completed. You can now test the app file upload/removal functionality."
