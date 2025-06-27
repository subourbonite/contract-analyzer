import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as customResources from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';

export class ContractAnalyzerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 Bucket for contract file storage
    const contractsBucket = new s3.Bucket(this, 'ContractsBucket', {
      bucketName: 'oil-gas-contracts-' + cdk.Aws.ACCOUNT_ID + '-' + cdk.Aws.REGION,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.POST,
            s3.HttpMethods.PUT,
            s3.HttpMethods.DELETE,
          ],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
        },
      ],
    });

    // Cognito User Pool
    const userPool = new cognito.UserPool(this, 'ContractAnalyzerUserPool', {
      userPoolName: 'contract-analyzer-users',
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Cognito User Pool Client
    const userPoolClient = new cognito.UserPoolClient(this, 'ContractAnalyzerUserPoolClient', {
      userPool,
      authFlows: {
        adminUserPassword: true,
        custom: true,
        userSrp: true,
      },
      supportedIdentityProviders: [cognito.UserPoolClientIdentityProvider.COGNITO],
    });

    // Cognito Identity Pool
    const identityPool = new cognito.CfnIdentityPool(this, 'ContractAnalyzerIdentityPool', {
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [
        {
          clientId: userPoolClient.userPoolClientId,
          providerName: userPool.userPoolProviderName,
        },
      ],
    });

    // IAM role for authenticated users
    const authenticatedRole = new iam.Role(this, 'CognitoDefaultAuthenticatedRole', {
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': identityPool.ref,
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'authenticated',
          },
        },
        'sts:AssumeRoleWithWebIdentity'
      ),
    });

    // Grant authenticated users access to S3 bucket
    contractsBucket.grantReadWrite(authenticatedRole);

    // Grant authenticated users access to Textract
    authenticatedRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'textract:DetectDocumentText',
          'textract:AnalyzeDocument',
          'textract:StartDocumentTextDetection',
          'textract:GetDocumentTextDetection',
        ],
        resources: ['*'],
      })
    );

    // Grant authenticated users access to Bedrock
    authenticatedRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'bedrock:InvokeModel',
          'bedrock:InvokeModelWithResponseStream',
        ],
        resources: [
          // Inference profile ARN (this is region-specific)
          `arn:aws:bedrock:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:inference-profile/us.anthropic.claude-sonnet-4-20250514-v1:0`,

          // Foundation models in all regions that the Claude 4 Sonnet inference profile can route to
          // us-east-1 models
          'arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-sonnet-4-20250514-v1:0',
          'arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0',
          'arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-haiku-20240307-v1:0',
          'arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-text-express-v1',

          // us-east-2 models (Claude 4 Sonnet inference profile can route here)
          'arn:aws:bedrock:us-east-2::foundation-model/anthropic.claude-sonnet-4-20250514-v1:0',
          'arn:aws:bedrock:us-east-2::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0',
          'arn:aws:bedrock:us-east-2::foundation-model/anthropic.claude-3-haiku-20240307-v1:0',
          'arn:aws:bedrock:us-east-2::foundation-model/amazon.titan-text-express-v1',

          // us-west-2 models (Claude 4 Sonnet inference profile can route here)
          'arn:aws:bedrock:us-west-2::foundation-model/anthropic.claude-sonnet-4-20250514-v1:0',
          'arn:aws:bedrock:us-west-2::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0',
          'arn:aws:bedrock:us-west-2::foundation-model/anthropic.claude-3-haiku-20240307-v1:0',
          'arn:aws:bedrock:us-west-2::foundation-model/amazon.titan-text-express-v1',
        ],
      })
    );

    // Attach the authenticated role to the identity pool
    new cognito.CfnIdentityPoolRoleAttachment(this, 'IdentityPoolRoleAttachment', {
      identityPoolId: identityPool.ref,
      roles: {
        authenticated: authenticatedRole.roleArn,
      },
    });

    // Lambda function for contract processing
    const contractProcessorFunction = new lambda.Function(this, 'ContractProcessor', {
      runtime: lambda.Runtime.PYTHON_3_10,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
import json
import boto3
import base64

def handler(event, context):
    textract = boto3.client('textract')
    bedrock = boto3.client('bedrock-runtime')

    try:
        # Extract text from document using Textract
        # This is a simplified example - you would implement full processing here

        response = {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Contract processed successfully',
                'analysis': {
                    'lessors': ['Sample Lessor'],
                    'lessees': ['Sample Lessee'],
                    'acreage': '160 acres',
                    'depths': 'All formations',
                    'term': '5 years',
                    'royalty': '12.5%',
                    'insights': ['Standard terms for this region']
                }
            })
        }

        return response

    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
      `),
      environment: {
        CONTRACTS_BUCKET: contractsBucket.bucketName,
      },
    });

    // Example: If you need to add Node.js Lambda functions in the future
    // const nodeJsFunction = new lambda.Function(this, 'NodeJsProcessor', {
    //   runtime: lambda.Runtime.NODEJS_20_X, // Use Node.js 20 instead of 18
    //   handler: 'index.handler',
    //   code: lambda.Code.fromInline(`
    //     exports.handler = async (event) => {
    //       console.log('Processing with Node.js 20');
    //       return {
    //         statusCode: 200,
    //         body: JSON.stringify({ message: 'Node.js 20 Lambda executed successfully' })
    //       };
    //     };
    //   `),
    // });

    // Grant Lambda function permissions
    contractsBucket.grantReadWrite(contractProcessorFunction);
    contractProcessorFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'textract:DetectDocumentText',
          'textract:AnalyzeDocument',
          'bedrock:InvokeModel',
        ],
        resources: ['*'],
      })
    );

    // API Gateway
    const api = new apigateway.RestApi(this, 'ContractAnalyzerApi', {
      restApiName: 'Contract Analyzer API',
      description: 'API for processing oil and gas lease contracts',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
      },
    });

    const contractsResource = api.root.addResource('contracts');
    const processResource = contractsResource.addResource('process');

    processResource.addMethod('POST', new apigateway.LambdaIntegration(contractProcessorFunction));

    // Outputs
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });

    new cdk.CfnOutput(this, 'IdentityPoolId', {
      value: identityPool.ref,
      description: 'Cognito Identity Pool ID',
    });

    new cdk.CfnOutput(this, 'ContractsBucketName', {
      value: contractsBucket.bucketName,
      description: 'S3 Bucket for contract storage',
    });

    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'Region', {
      value: cdk.Aws.REGION,
      description: 'AWS Region',
    });
  }
}
