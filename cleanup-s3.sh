#!/bin/bash

echo "Cleaning up orphaned S3 files..."

# List all files in the contracts bucket
echo "Current S3 files:"
aws s3 ls s3://oil-gas-contracts-474668386339-us-east-1/contracts/ --recursive

echo ""
echo "Removing orphaned files (keeping only recent ones for safety)..."

# Remove specific orphaned files (you can adjust this list)
orphaned_files=(
    "contracts/1750992644863-Executed OGL - Rosewood - Butterfly.pdf"
    "contracts/1750992879664-Executed OGL - Rosewood - Butterfly.pdf"
    "contracts/1750992980561-Executed OGL - Rosewood - Butterfly.pdf"
    "contracts/1750993715538-Executed OGL - Rosewood - Butterfly.pdf"
    "contracts/1750994086932-Executed OGL - Rosewood - Butterfly.pdf"
    "contracts/1750994473828-Executed OGL - Rosewood - Butterfly.pdf"
    "contracts/1750995079949-Executed OGL - Rosewood - Butterfly.pdf"
    "contracts/1750995425312-Executed OGL - Rosewood - Butterfly-2.pdf"
    "contracts/1750995472244-Executed OGL - Rosewood - Butterfly.pdf"
)

for file in "${orphaned_files[@]}"; do
    echo "Removing: $file"
    aws s3 rm "s3://oil-gas-contracts-474668386339-us-east-1/$file"
done

echo ""
echo "Remaining S3 files:"
aws s3 ls s3://oil-gas-contracts-474668386339-us-east-1/contracts/ --recursive

echo ""
echo "Cleanup completed!"
