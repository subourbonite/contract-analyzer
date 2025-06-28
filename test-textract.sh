#!/bin/bash

# Test if we can start a small Textract job
echo "🧪 Testing Textract job initiation..."

# Create a tiny test file
echo "This is a test document for Textract." > test-doc.txt

# Upload to S3
aws s3 cp test-doc.txt s3://oil-gas-contracts-474668386339-us-east-1/test-textract.txt

# Try to start a Textract job
echo "Starting test Textract job..."
JOB_RESPONSE=$(aws textract start-document-text-detection \
    --document-location '{"S3Object":{"Bucket":"oil-gas-contracts-474668386339-us-east-1","Name":"test-textract.txt"}}' \
    2>&1)

if echo "$JOB_RESPONSE" | grep -q "JobId"; then
    JOB_ID=$(echo "$JOB_RESPONSE" | jq -r '.JobId')
    echo "✅ Test job started successfully: $JOB_ID"

    # Wait a moment then check status
    sleep 5
    STATUS_RESPONSE=$(aws textract get-document-text-detection --job-id "$JOB_ID" 2>&1)

    if echo "$STATUS_RESPONSE" | grep -q "SUCCEEDED\|IN_PROGRESS\|FAILED"; then
        echo "✅ Job status retrievable"
        echo "$STATUS_RESPONSE" | jq -r '.JobStatus'
    else
        echo "❌ Cannot get job status"
        echo "$STATUS_RESPONSE"
    fi
else
    echo "❌ Failed to start test job"
    echo "$JOB_RESPONSE"
fi

# Cleanup
aws s3 rm s3://oil-gas-contracts-474668386339-us-east-1/test-textract.txt

echo "🧪 Test complete"
