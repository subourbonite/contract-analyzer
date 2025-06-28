#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ContractAnalyzerStack } from '../lib/contract-analyzer-stack';

const app = new cdk.App();
new ContractAnalyzerStack(app, 'ContractAnalyzerStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
});
