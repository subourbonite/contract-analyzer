"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractAnalyzerStack = void 0;
const cdk = require("aws-cdk-lib");
const cognito = require("aws-cdk-lib/aws-cognito");
const s3 = require("aws-cdk-lib/aws-s3");
const iam = require("aws-cdk-lib/aws-iam");
const lambda = require("aws-cdk-lib/aws-lambda");
const apigateway = require("aws-cdk-lib/aws-apigateway");
class ContractAnalyzerStack extends cdk.Stack {
    constructor(scope, id, props) {
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
            assumedBy: new iam.FederatedPrincipal('cognito-identity.amazonaws.com', {
                StringEquals: {
                    'cognito-identity.amazonaws.com:aud': identityPool.ref,
                },
                'ForAnyValue:StringLike': {
                    'cognito-identity.amazonaws.com:amr': 'authenticated',
                },
            }, 'sts:AssumeRoleWithWebIdentity'),
        });
        // Grant authenticated users access to S3 bucket
        contractsBucket.grantReadWrite(authenticatedRole);
        // Grant authenticated users access to Textract
        authenticatedRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'textract:DetectDocumentText',
                'textract:AnalyzeDocument',
                'textract:StartDocumentTextDetection',
                'textract:GetDocumentTextDetection',
            ],
            resources: ['*'],
        }));
        // Grant authenticated users access to Bedrock
        authenticatedRole.addToPolicy(new iam.PolicyStatement({
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
        }));
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
        contractProcessorFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'textract:DetectDocumentText',
                'textract:AnalyzeDocument',
                'bedrock:InvokeModel',
            ],
            resources: ['*'],
        }));
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
exports.ContractAnalyzerStack = ContractAnalyzerStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udHJhY3QtYW5hbHl6ZXItc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjb250cmFjdC1hbmFseXplci1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtQ0FBbUM7QUFDbkMsbURBQW1EO0FBQ25ELHlDQUF5QztBQUN6QywyQ0FBMkM7QUFDM0MsaURBQWlEO0FBQ2pELHlEQUF5RDtBQUl6RCxNQUFhLHFCQUFzQixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBQ2xELFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBc0I7UUFDOUQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsc0NBQXNDO1FBQ3RDLE1BQU0sZUFBZSxHQUFHLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEVBQUU7WUFDN0QsVUFBVSxFQUFFLG9CQUFvQixHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsVUFBVSxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU07WUFDNUUsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztZQUN4QyxpQkFBaUIsRUFBRSxJQUFJO1lBQ3ZCLElBQUksRUFBRTtnQkFDSjtvQkFDRSxjQUFjLEVBQUU7d0JBQ2QsRUFBRSxDQUFDLFdBQVcsQ0FBQyxHQUFHO3dCQUNsQixFQUFFLENBQUMsV0FBVyxDQUFDLElBQUk7d0JBQ25CLEVBQUUsQ0FBQyxXQUFXLENBQUMsR0FBRzt3QkFDbEIsRUFBRSxDQUFDLFdBQVcsQ0FBQyxNQUFNO3FCQUN0QjtvQkFDRCxjQUFjLEVBQUUsQ0FBQyxHQUFHLENBQUM7b0JBQ3JCLGNBQWMsRUFBRSxDQUFDLEdBQUcsQ0FBQztpQkFDdEI7YUFDRjtTQUNGLENBQUMsQ0FBQztRQUVILG9CQUFvQjtRQUNwQixNQUFNLFFBQVEsR0FBRyxJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxF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LElBQUksRUFBRSxrQkFBa0IsRUFBRTtZQUMxQyxLQUFLLEVBQUUsY0FBYyxDQUFDLGdCQUFnQjtZQUN0QyxXQUFXLEVBQUUsNkJBQTZCO1NBQzNDLENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLEVBQUU7WUFDeEMsS0FBSyxFQUFFLFlBQVksQ0FBQyxHQUFHO1lBQ3ZCLFdBQVcsRUFBRSwwQkFBMEI7U0FDeEMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxxQkFBcUIsRUFBRTtZQUM3QyxLQUFLLEVBQUUsZUFBZSxDQUFDLFVBQVU7WUFDakMsV0FBVyxFQUFFLGdDQUFnQztTQUM5QyxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRTtZQUN2QyxLQUFLLEVBQUUsR0FBRyxDQUFDLEdBQUc7WUFDZCxXQUFXLEVBQUUsaUJBQWlCO1NBQy9CLENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFO1lBQ2hDLEtBQUssRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU07WUFDckIsV0FBVyxFQUFFLFlBQVk7U0FDMUIsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBelFELHNEQXlRQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XHJcbmltcG9ydCAqIGFzIGNvZ25pdG8gZnJvbSAnYXdzLWNkay1saWIvYXdzLWNvZ25pdG8nO1xyXG5pbXBvcnQgKiBhcyBzMyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnO1xyXG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XHJcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcclxuaW1wb3J0ICogYXMgYXBpZ2F0ZXdheSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheSc7XHJcbmltcG9ydCAqIGFzIGN1c3RvbVJlc291cmNlcyBmcm9tICdhd3MtY2RrLWxpYi9jdXN0b20tcmVzb3VyY2VzJztcclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XHJcblxyXG5leHBvcnQgY2xhc3MgQ29udHJhY3RBbmFseXplclN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcclxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IGNkay5TdGFja1Byb3BzKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcclxuXHJcbiAgICAvLyBTMyBCdWNrZXQgZm9yIGNvbnRyYWN0IGZpbGUgc3RvcmFnZVxyXG4gICAgY29uc3QgY29udHJhY3RzQnVja2V0ID0gbmV3IHMzLkJ1Y2tldCh0aGlzLCAnQ29udHJhY3RzQnVja2V0Jywge1xyXG4gICAgICBidWNrZXROYW1lOiAnb2lsLWdhcy1jb250cmFjdHMtJyArIGNkay5Bd3MuQUNDT1VOVF9JRCArICctJyArIGNkay5Bd3MuUkVHSU9OLFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgICBhdXRvRGVsZXRlT2JqZWN0czogdHJ1ZSxcclxuICAgICAgY29yczogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIGFsbG93ZWRNZXRob2RzOiBbXHJcbiAgICAgICAgICAgIHMzLkh0dHBNZXRob2RzLkdFVCxcclxuICAgICAgICAgICAgczMuSHR0cE1ldGhvZHMuUE9TVCxcclxuICAgICAgICAgICAgczMuSHR0cE1ldGhvZHMuUFVULFxyXG4gICAgICAgICAgICBzMy5IdHRwTWV0aG9kcy5ERUxFVEUsXHJcbiAgICAgICAgICBdLFxyXG4gICAgICAgICAgYWxsb3dlZE9yaWdpbnM6IFsnKiddLFxyXG4gICAgICAgICAgYWxsb3dlZEhlYWRlcnM6IFsnKiddLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIF0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDb2duaXRvIFVzZXIgUG9vbFxyXG4gICAgY29uc3QgdXNlclBvb2wgPSBuZXcgY29nbml0by5Vc2VyUG9vbCh0aGlzLCAnQ29udHJhY3RBbmFseXplclVzZXJQb29sJywge1xyXG4gICAgICB1c2VyUG9vbE5hbWU6ICdjb250cmFjdC1hbmFseXplci11c2VycycsXHJcbiAgICAgIHNlbGZTaWduVXBFbmFibGVkOiB0cnVlLFxyXG4gICAgICBzaWduSW5BbGlhc2VzOiB7IGVtYWlsOiB0cnVlIH0sXHJcbiAgICAgIGF1dG9WZXJpZnk6IHsgZW1haWw6IHRydWUgfSxcclxuICAgICAgc3RhbmRhcmRBdHRyaWJ1dGVzOiB7XHJcbiAgICAgICAgZW1haWw6IHtcclxuICAgICAgICAgIHJlcXVpcmVkOiB0cnVlLFxyXG4gICAgICAgICAgbXV0YWJsZTogdHJ1ZSxcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgICBwYXNzd29yZFBvbGljeToge1xyXG4gICAgICAgIG1pbkxlbmd0aDogOCxcclxuICAgICAgICByZXF1aXJlTG93ZXJjYXNlOiB0cnVlLFxyXG4gICAgICAgIHJlcXVpcmVVcHBlcmNhc2U6IHRydWUsXHJcbiAgICAgICAgcmVxdWlyZURpZ2l0czogdHJ1ZSxcclxuICAgICAgICByZXF1aXJlU3ltYm9sczogZmFsc2UsXHJcbiAgICAgIH0sXHJcbiAgICAgIGFjY291bnRSZWNvdmVyeTogY29nbml0by5BY2NvdW50UmVjb3ZlcnkuRU1BSUxfT05MWSxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENvZ25pdG8gVXNlciBQb29sIENsaWVudFxyXG4gICAgY29uc3QgdXNlclBvb2xDbGllbnQgPSBuZXcgY29nbml0by5Vc2VyUG9vbENsaWVudCh0aGlzLCAnQ29udHJhY3RBbmFseXplclVzZXJQb29sQ2xpZW50Jywge1xyXG4gICAgICB1c2VyUG9vbCxcclxuICAgICAgYXV0aEZsb3dzOiB7XHJcbiAgICAgICAgYWRtaW5Vc2VyUGFzc3dvcmQ6IHRydWUsXHJcbiAgICAgICAgY3VzdG9tOiB0cnVlLFxyXG4gICAgICAgIHVzZXJTcnA6IHRydWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHN1cHBvcnRlZElkZW50aXR5UHJvdmlkZXJzOiBbY29nbml0by5Vc2VyUG9vbENsaWVudElkZW50aXR5UHJvdmlkZXIuQ09HTklUT10sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDb2duaXRvIElkZW50aXR5IFBvb2xcclxuICAgIGNvbnN0IGlkZW50aXR5UG9vbCA9IG5ldyBjb2duaXRvLkNmbklkZW50aXR5UG9vbCh0aGlzLCAnQ29udHJhY3RBbmFseXplcklkZW50aXR5UG9vbCcsIHtcclxuICAgICAgYWxsb3dVbmF1dGhlbnRpY2F0ZWRJZGVudGl0aWVzOiBmYWxzZSxcclxuICAgICAgY29nbml0b0lkZW50aXR5UHJvdmlkZXJzOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgY2xpZW50SWQ6IHVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsXHJcbiAgICAgICAgICBwcm92aWRlck5hbWU6IHVzZXJQb29sLnVzZXJQb29sUHJvdmlkZXJOYW1lLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIF0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBJQU0gcm9sZSBmb3IgYXV0aGVudGljYXRlZCB1c2Vyc1xyXG4gICAgY29uc3QgYXV0aGVudGljYXRlZFJvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgJ0NvZ25pdG9EZWZhdWx0QXV0aGVudGljYXRlZFJvbGUnLCB7XHJcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5GZWRlcmF0ZWRQcmluY2lwYWwoXHJcbiAgICAgICAgJ2NvZ25pdG8taWRlbnRpdHkuYW1hem9uYXdzLmNvbScsXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgU3RyaW5nRXF1YWxzOiB7XHJcbiAgICAgICAgICAgICdjb2duaXRvLWlkZW50aXR5LmFtYXpvbmF3cy5jb206YXVkJzogaWRlbnRpdHlQb29sLnJlZixcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICAnRm9yQW55VmFsdWU6U3RyaW5nTGlrZSc6IHtcclxuICAgICAgICAgICAgJ2NvZ25pdG8taWRlbnRpdHkuYW1hem9uYXdzLmNvbTphbXInOiAnYXV0aGVudGljYXRlZCcsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgJ3N0czpBc3N1bWVSb2xlV2l0aFdlYklkZW50aXR5J1xyXG4gICAgICApLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gR3JhbnQgYXV0aGVudGljYXRlZCB1c2VycyBhY2Nlc3MgdG8gUzMgYnVja2V0XHJcbiAgICBjb250cmFjdHNCdWNrZXQuZ3JhbnRSZWFkV3JpdGUoYXV0aGVudGljYXRlZFJvbGUpO1xyXG5cclxuICAgIC8vIEdyYW50IGF1dGhlbnRpY2F0ZWQgdXNlcnMgYWNjZXNzIHRvIFRleHRyYWN0XHJcbiAgICBhdXRoZW50aWNhdGVkUm9sZS5hZGRUb1BvbGljeShcclxuICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgICAndGV4dHJhY3Q6RGV0ZWN0RG9jdW1lbnRUZXh0JyxcclxuICAgICAgICAgICd0ZXh0cmFjdDpBbmFseXplRG9jdW1lbnQnLFxyXG4gICAgICAgICAgJ3RleHRyYWN0OlN0YXJ0RG9jdW1lbnRUZXh0RGV0ZWN0aW9uJyxcclxuICAgICAgICAgICd0ZXh0cmFjdDpHZXREb2N1bWVudFRleHREZXRlY3Rpb24nLFxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgcmVzb3VyY2VzOiBbJyonXSxcclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAgLy8gR3JhbnQgYXV0aGVudGljYXRlZCB1c2VycyBhY2Nlc3MgdG8gQmVkcm9ja1xyXG4gICAgYXV0aGVudGljYXRlZFJvbGUuYWRkVG9Qb2xpY3koXHJcbiAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICAgJ2JlZHJvY2s6SW52b2tlTW9kZWwnLFxyXG4gICAgICAgICAgJ2JlZHJvY2s6SW52b2tlTW9kZWxXaXRoUmVzcG9uc2VTdHJlYW0nLFxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgcmVzb3VyY2VzOiBbXHJcbiAgICAgICAgICAvLyBJbmZlcmVuY2UgcHJvZmlsZSBBUk4gKHRoaXMgaXMgcmVnaW9uLXNwZWNpZmljKVxyXG4gICAgICAgICAgYGFybjphd3M6YmVkcm9jazoke2Nkay5Bd3MuUkVHSU9OfToke2Nkay5Bd3MuQUNDT1VOVF9JRH06aW5mZXJlbmNlLXByb2ZpbGUvdXMuYW50aHJvcGljLmNsYXVkZS1zb25uZXQtNC0yMDI1MDUxNC12MTowYCxcclxuXHJcbiAgICAgICAgICAvLyBGb3VuZGF0aW9uIG1vZGVscyBpbiBhbGwgcmVnaW9ucyB0aGF0IHRoZSBDbGF1ZGUgNCBTb25uZXQgaW5mZXJlbmNlIHByb2ZpbGUgY2FuIHJvdXRlIHRvXHJcbiAgICAgICAgICAvLyB1cy1lYXN0LTEgbW9kZWxzXHJcbiAgICAgICAgICAnYXJuOmF3czpiZWRyb2NrOnVzLWVhc3QtMTo6Zm91bmRhdGlvbi1tb2RlbC9hbnRocm9waWMuY2xhdWRlLXNvbm5ldC00LTIwMjUwNTE0LXYxOjAnLFxyXG4gICAgICAgICAgJ2Fybjphd3M6YmVkcm9jazp1cy1lYXN0LTE6OmZvdW5kYXRpb24tbW9kZWwvYW50aHJvcGljLmNsYXVkZS0zLXNvbm5ldC0yMDI0MDIyOS12MTowJyxcclxuICAgICAgICAgICdhcm46YXdzOmJlZHJvY2s6dXMtZWFzdC0xOjpmb3VuZGF0aW9uLW1vZGVsL2FudGhyb3BpYy5jbGF1ZGUtMy1oYWlrdS0yMDI0MDMwNy12MTowJyxcclxuICAgICAgICAgICdhcm46YXdzOmJlZHJvY2s6dXMtZWFzdC0xOjpmb3VuZGF0aW9uLW1vZGVsL2FtYXpvbi50aXRhbi10ZXh0LWV4cHJlc3MtdjEnLFxyXG5cclxuICAgICAgICAgIC8vIHVzLWVhc3QtMiBtb2RlbHMgKENsYXVkZSA0IFNvbm5ldCBpbmZlcmVuY2UgcHJvZmlsZSBjYW4gcm91dGUgaGVyZSlcclxuICAgICAgICAgICdhcm46YXdzOmJlZHJvY2s6dXMtZWFzdC0yOjpmb3VuZGF0aW9uLW1vZGVsL2FudGhyb3BpYy5jbGF1ZGUtc29ubmV0LTQtMjAyNTA1MTQtdjE6MCcsXHJcbiAgICAgICAgICAnYXJuOmF3czpiZWRyb2NrOnVzLWVhc3QtMjo6Zm91bmRhdGlvbi1tb2RlbC9hbnRocm9waWMuY2xhdWRlLTMtc29ubmV0LTIwMjQwMjI5LXYxOjAnLFxyXG4gICAgICAgICAgJ2Fybjphd3M6YmVkcm9jazp1cy1lYXN0LTI6OmZvdW5kYXRpb24tbW9kZWwvYW50aHJvcGljLmNsYXVkZS0zLWhhaWt1LTIwMjQwMzA3LXYxOjAnLFxyXG4gICAgICAgICAgJ2Fybjphd3M6YmVkcm9jazp1cy1lYXN0LTI6OmZvdW5kYXRpb24tbW9kZWwvYW1hem9uLnRpdGFuLXRleHQtZXhwcmVzcy12MScsXHJcblxyXG4gICAgICAgICAgLy8gdXMtd2VzdC0yIG1vZGVscyAoQ2xhdWRlIDQgU29ubmV0IGluZmVyZW5jZSBwcm9maWxlIGNhbiByb3V0ZSBoZXJlKVxyXG4gICAgICAgICAgJ2Fybjphd3M6YmVkcm9jazp1cy13ZXN0LTI6OmZvdW5kYXRpb24tbW9kZWwvYW50aHJvcGljLmNsYXVkZS1zb25uZXQtNC0yMDI1MDUxNC12MTowJyxcclxuICAgICAgICAgICdhcm46YXdzOmJlZHJvY2s6dXMtd2VzdC0yOjpmb3VuZGF0aW9uLW1vZGVsL2FudGhyb3BpYy5jbGF1ZGUtMy1zb25uZXQtMjAyNDAyMjktdjE6MCcsXHJcbiAgICAgICAgICAnYXJuOmF3czpiZWRyb2NrOnVzLXdlc3QtMjo6Zm91bmRhdGlvbi1tb2RlbC9hbnRocm9waWMuY2xhdWRlLTMtaGFpa3UtMjAyNDAzMDctdjE6MCcsXHJcbiAgICAgICAgICAnYXJuOmF3czpiZWRyb2NrOnVzLXdlc3QtMjo6Zm91bmRhdGlvbi1tb2RlbC9hbWF6b24udGl0YW4tdGV4dC1leHByZXNzLXYxJyxcclxuICAgICAgICBdLFxyXG4gICAgICB9KVxyXG4gICAgKTtcclxuXHJcbiAgICAvLyBBdHRhY2ggdGhlIGF1dGhlbnRpY2F0ZWQgcm9sZSB0byB0aGUgaWRlbnRpdHkgcG9vbFxyXG4gICAgbmV3IGNvZ25pdG8uQ2ZuSWRlbnRpdHlQb29sUm9sZUF0dGFjaG1lbnQodGhpcywgJ0lkZW50aXR5UG9vbFJvbGVBdHRhY2htZW50Jywge1xyXG4gICAgICBpZGVudGl0eVBvb2xJZDogaWRlbnRpdHlQb29sLnJlZixcclxuICAgICAgcm9sZXM6IHtcclxuICAgICAgICBhdXRoZW50aWNhdGVkOiBhdXRoZW50aWNhdGVkUm9sZS5yb2xlQXJuLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gTGFtYmRhIGZ1bmN0aW9uIGZvciBjb250cmFjdCBwcm9jZXNzaW5nXHJcbiAgICBjb25zdCBjb250cmFjdFByb2Nlc3NvckZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnQ29udHJhY3RQcm9jZXNzb3InLCB7XHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLlBZVEhPTl8zXzEwLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21JbmxpbmUoYFxyXG5pbXBvcnQganNvblxyXG5pbXBvcnQgYm90bzNcclxuaW1wb3J0IGJhc2U2NFxyXG5cclxuZGVmIGhhbmRsZXIoZXZlbnQsIGNvbnRleHQpOlxyXG4gICAgdGV4dHJhY3QgPSBib3RvMy5jbGllbnQoJ3RleHRyYWN0JylcclxuICAgIGJlZHJvY2sgPSBib3RvMy5jbGllbnQoJ2JlZHJvY2stcnVudGltZScpXHJcblxyXG4gICAgdHJ5OlxyXG4gICAgICAgICMgRXh0cmFjdCB0ZXh0IGZyb20gZG9jdW1lbnQgdXNpbmcgVGV4dHJhY3RcclxuICAgICAgICAjIFRoaXMgaXMgYSBzaW1wbGlmaWVkIGV4YW1wbGUgLSB5b3Ugd291bGQgaW1wbGVtZW50IGZ1bGwgcHJvY2Vzc2luZyBoZXJlXHJcblxyXG4gICAgICAgIHJlc3BvbnNlID0ge1xyXG4gICAgICAgICAgICAnc3RhdHVzQ29kZSc6IDIwMCxcclxuICAgICAgICAgICAgJ2JvZHknOiBqc29uLmR1bXBzKHtcclxuICAgICAgICAgICAgICAgICdtZXNzYWdlJzogJ0NvbnRyYWN0IHByb2Nlc3NlZCBzdWNjZXNzZnVsbHknLFxyXG4gICAgICAgICAgICAgICAgJ2FuYWx5c2lzJzoge1xyXG4gICAgICAgICAgICAgICAgICAgICdsZXNzb3JzJzogWydTYW1wbGUgTGVzc29yJ10sXHJcbiAgICAgICAgICAgICAgICAgICAgJ2xlc3NlZXMnOiBbJ1NhbXBsZSBMZXNzZWUnXSxcclxuICAgICAgICAgICAgICAgICAgICAnYWNyZWFnZSc6ICcxNjAgYWNyZXMnLFxyXG4gICAgICAgICAgICAgICAgICAgICdkZXB0aHMnOiAnQWxsIGZvcm1hdGlvbnMnLFxyXG4gICAgICAgICAgICAgICAgICAgICd0ZXJtJzogJzUgeWVhcnMnLFxyXG4gICAgICAgICAgICAgICAgICAgICdyb3lhbHR5JzogJzEyLjUlJyxcclxuICAgICAgICAgICAgICAgICAgICAnaW5zaWdodHMnOiBbJ1N0YW5kYXJkIHRlcm1zIGZvciB0aGlzIHJlZ2lvbiddXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gcmVzcG9uc2VcclxuXHJcbiAgICBleGNlcHQgRXhjZXB0aW9uIGFzIGU6XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgJ3N0YXR1c0NvZGUnOiA1MDAsXHJcbiAgICAgICAgICAgICdib2R5JzoganNvbi5kdW1wcyh7J2Vycm9yJzogc3RyKGUpfSlcclxuICAgICAgICB9XHJcbiAgICAgIGApLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIENPTlRSQUNUU19CVUNLRVQ6IGNvbnRyYWN0c0J1Y2tldC5idWNrZXROYW1lLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gRXhhbXBsZTogSWYgeW91IG5lZWQgdG8gYWRkIE5vZGUuanMgTGFtYmRhIGZ1bmN0aW9ucyBpbiB0aGUgZnV0dXJlXHJcbiAgICAvLyBjb25zdCBub2RlSnNGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ05vZGVKc1Byb2Nlc3NvcicsIHtcclxuICAgIC8vICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsIC8vIFVzZSBOb2RlLmpzIDIwIGluc3RlYWQgb2YgMThcclxuICAgIC8vICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgLy8gICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tSW5saW5lKGBcclxuICAgIC8vICAgICBleHBvcnRzLmhhbmRsZXIgPSBhc3luYyAoZXZlbnQpID0+IHtcclxuICAgIC8vICAgICAgIGNvbnNvbGUubG9nKCdQcm9jZXNzaW5nIHdpdGggTm9kZS5qcyAyMCcpO1xyXG4gICAgLy8gICAgICAgcmV0dXJuIHtcclxuICAgIC8vICAgICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgLy8gICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IG1lc3NhZ2U6ICdOb2RlLmpzIDIwIExhbWJkYSBleGVjdXRlZCBzdWNjZXNzZnVsbHknIH0pXHJcbiAgICAvLyAgICAgICB9O1xyXG4gICAgLy8gICAgIH07XHJcbiAgICAvLyAgIGApLFxyXG4gICAgLy8gfSk7XHJcblxyXG4gICAgLy8gR3JhbnQgTGFtYmRhIGZ1bmN0aW9uIHBlcm1pc3Npb25zXHJcbiAgICBjb250cmFjdHNCdWNrZXQuZ3JhbnRSZWFkV3JpdGUoY29udHJhY3RQcm9jZXNzb3JGdW5jdGlvbik7XHJcbiAgICBjb250cmFjdFByb2Nlc3NvckZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShcclxuICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgICAndGV4dHJhY3Q6RGV0ZWN0RG9jdW1lbnRUZXh0JyxcclxuICAgICAgICAgICd0ZXh0cmFjdDpBbmFseXplRG9jdW1lbnQnLFxyXG4gICAgICAgICAgJ2JlZHJvY2s6SW52b2tlTW9kZWwnLFxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgcmVzb3VyY2VzOiBbJyonXSxcclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAgLy8gQVBJIEdhdGV3YXlcclxuICAgIGNvbnN0IGFwaSA9IG5ldyBhcGlnYXRld2F5LlJlc3RBcGkodGhpcywgJ0NvbnRyYWN0QW5hbHl6ZXJBcGknLCB7XHJcbiAgICAgIHJlc3RBcGlOYW1lOiAnQ29udHJhY3QgQW5hbHl6ZXIgQVBJJyxcclxuICAgICAgZGVzY3JpcHRpb246ICdBUEkgZm9yIHByb2Nlc3Npbmcgb2lsIGFuZCBnYXMgbGVhc2UgY29udHJhY3RzJyxcclxuICAgICAgZGVmYXVsdENvcnNQcmVmbGlnaHRPcHRpb25zOiB7XHJcbiAgICAgICAgYWxsb3dPcmlnaW5zOiBhcGlnYXRld2F5LkNvcnMuQUxMX09SSUdJTlMsXHJcbiAgICAgICAgYWxsb3dNZXRob2RzOiBhcGlnYXRld2F5LkNvcnMuQUxMX01FVEhPRFMsXHJcbiAgICAgICAgYWxsb3dIZWFkZXJzOiBbJ0NvbnRlbnQtVHlwZScsICdYLUFtei1EYXRlJywgJ0F1dGhvcml6YXRpb24nLCAnWC1BcGktS2V5J10sXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBjb250cmFjdHNSZXNvdXJjZSA9IGFwaS5yb290LmFkZFJlc291cmNlKCdjb250cmFjdHMnKTtcclxuICAgIGNvbnN0IHByb2Nlc3NSZXNvdXJjZSA9IGNvbnRyYWN0c1Jlc291cmNlLmFkZFJlc291cmNlKCdwcm9jZXNzJyk7XHJcblxyXG4gICAgcHJvY2Vzc1Jlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGNvbnRyYWN0UHJvY2Vzc29yRnVuY3Rpb24pKTtcclxuXHJcbiAgICAvLyBPdXRwdXRzXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVXNlclBvb2xJZCcsIHtcclxuICAgICAgdmFsdWU6IHVzZXJQb29sLnVzZXJQb29sSWQsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ29nbml0byBVc2VyIFBvb2wgSUQnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1VzZXJQb29sQ2xpZW50SWQnLCB7XHJcbiAgICAgIHZhbHVlOiB1c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0NvZ25pdG8gVXNlciBQb29sIENsaWVudCBJRCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnSWRlbnRpdHlQb29sSWQnLCB7XHJcbiAgICAgIHZhbHVlOiBpZGVudGl0eVBvb2wucmVmLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0NvZ25pdG8gSWRlbnRpdHkgUG9vbCBJRCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQ29udHJhY3RzQnVja2V0TmFtZScsIHtcclxuICAgICAgdmFsdWU6IGNvbnRyYWN0c0J1Y2tldC5idWNrZXROYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1MzIEJ1Y2tldCBmb3IgY29udHJhY3Qgc3RvcmFnZScsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXBpR2F0ZXdheVVybCcsIHtcclxuICAgICAgdmFsdWU6IGFwaS51cmwsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVBJIEdhdGV3YXkgVVJMJyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdSZWdpb24nLCB7XHJcbiAgICAgIHZhbHVlOiBjZGsuQXdzLlJFR0lPTixcclxuICAgICAgZGVzY3JpcHRpb246ICdBV1MgUmVnaW9uJyxcclxuICAgIH0pO1xyXG4gIH1cclxufVxyXG4iXX0=