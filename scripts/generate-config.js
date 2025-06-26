#!/usr/bin/env node

/**
 * Utility script to generate Amplify configuration from CDK stack outputs
 * Usage: node scripts/generate-config.js
 */

const { CloudFormationClient, DescribeStacksCommand } = require('@aws-sdk/client-cloudformation');
const fs = require('fs');
const path = require('path');

const STACK_NAME = 'ContractAnalyzerStack';
const CONFIG_PATH = path.join(__dirname, '..', 'src', 'amplifyconfiguration.json');

async function generateConfig() {
  try {
    const client = new CloudFormationClient({ region: process.env.AWS_REGION || 'us-east-1' });

    console.log(`📡 Fetching outputs from CloudFormation stack: ${STACK_NAME}`);

    const command = new DescribeStacksCommand({ StackName: STACK_NAME });
    const response = await client.send(command);

    if (!response.Stacks || response.Stacks.length === 0) {
      throw new Error(`Stack ${STACK_NAME} not found`);
    }

    const stack = response.Stacks[0];
    const outputs = stack.Outputs || [];

    // Convert outputs to a map for easier access
    const outputMap = {};
    outputs.forEach(output => {
      outputMap[output.OutputKey] = output.OutputValue;
    });

    console.log('📋 Found outputs:', Object.keys(outputMap));

    // Generate Amplify configuration
    const amplifyConfig = {
      aws_project_region: outputMap.Region || 'us-east-1',
      aws_cognito_identity_pool_id: outputMap.IdentityPoolId,
      aws_cognito_region: outputMap.Region || 'us-east-1',
      aws_user_pools_id: outputMap.UserPoolId,
      aws_user_pools_web_client_id: outputMap.UserPoolClientId,
      oauth: {},
      aws_cognito_username_attributes: ['email'],
      aws_cognito_social_providers: [],
      aws_cognito_signup_attributes: ['email'],
      aws_cognito_mfa_configuration: 'OFF',
      aws_cognito_mfa_types: ['SMS'],
      aws_cognito_password_protection_settings: {
        passwordPolicyMinLength: 8,
        passwordPolicyCharacters: []
      },
      aws_cognito_verification_mechanisms: ['email'],
      aws_user_files_s3_bucket: outputMap.ContractsBucketName,
      aws_user_files_s3_bucket_region: outputMap.Region || 'us-east-1',
      api_gateway_url: outputMap.ApiGatewayUrl
    };

    // Validate required values
    const requiredFields = [
      'aws_cognito_identity_pool_id',
      'aws_user_pools_id',
      'aws_user_pools_web_client_id',
      'aws_user_files_s3_bucket'
    ];

    const missingFields = requiredFields.filter(field => !amplifyConfig[field]);
    if (missingFields.length > 0) {
      throw new Error(`Missing required CDK outputs: ${missingFields.join(', ')}`);
    }

    // Write configuration file
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(amplifyConfig, null, 2));

    console.log('✅ Successfully generated Amplify configuration');
    console.log(`📁 Configuration saved to: ${CONFIG_PATH}`);
    console.log('🚀 You can now run: npm run dev');

  } catch (error) {
    console.error('❌ Error generating configuration:', error.message);
    process.exit(1);
  }
}

// Check if running directly
if (require.main === module) {
  generateConfig();
}

module.exports = generateConfig;
