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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udHJhY3QtYW5hbHl6ZXItc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjb250cmFjdC1hbmFseXplci1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtQ0FBbUM7QUFDbkMsbURBQW1EO0FBQ25ELHlDQUF5QztBQUN6QywyQ0FBMkM7QUFDM0MsaURBQWlEO0FBQ2pELHlEQUF5RDtBQUd6RCxNQUFhLHFCQUFzQixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBQ2xELFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBc0I7UUFDOUQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsc0NBQXNDO1FBQ3RDLE1BQU0sZUFBZSxHQUFHLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEVBQUU7WUFDN0QsVUFBVSxFQUFFLG9CQUFvQixHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsVUFBVSxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU07WUFDNUUsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztZQUN4QyxpQkFBaUIsRUFBRSxJQUFJO1lBQ3ZCLElBQUksRUFBRTtnQkFDSjtvQkFDRSxjQUFjLEVBQUU7d0JBQ2QsRUFBRSxDQUFDLFdBQVcsQ0FBQyxHQUFHO3dCQUNsQixFQUFFLENBQUMsV0FBVyxDQUFDLElBQUk7d0JBQ25CLEVBQUUsQ0FBQyxXQUFXLENBQUMsR0FBRzt3QkFDbEIsRUFBRSxDQUFDLFdBQVcsQ0FBQyxNQUFNO3FCQUN0QjtvQkFDRCxjQUFjLEVBQUUsQ0FBQyxHQUFHLENBQUM7b0JBQ3JCLGNBQWMsRUFBRSxDQUFDLEdBQUcsQ0FBQztpQkFDdEI7YUFDRjtTQUNGLENBQUMsQ0FBQztRQUVILG9CQUFvQjtRQUNwQixNQUFNLFFBQVEsR0FBRyxJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxF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QUMsR0FBRztZQUN2QixXQUFXLEVBQUUsMEJBQTBCO1NBQ3hDLENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUscUJBQXFCLEVBQUU7WUFDN0MsS0FBSyxFQUFFLGVBQWUsQ0FBQyxVQUFVO1lBQ2pDLFdBQVcsRUFBRSxnQ0FBZ0M7U0FDOUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxlQUFlLEVBQUU7WUFDdkMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxHQUFHO1lBQ2QsV0FBVyxFQUFFLGlCQUFpQjtTQUMvQixDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRTtZQUNoQyxLQUFLLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNO1lBQ3JCLFdBQVcsRUFBRSxZQUFZO1NBQzFCLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQTFQRCxzREEwUEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgY29nbml0byBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY29nbml0byc7XG5pbXBvcnQgKiBhcyBzMyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnO1xuaW1wb3J0ICogYXMgYXBpZ2F0ZXdheSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheSc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcblxuZXhwb3J0IGNsYXNzIENvbnRyYWN0QW5hbHl6ZXJTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogY2RrLlN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIC8vIFMzIEJ1Y2tldCBmb3IgY29udHJhY3QgZmlsZSBzdG9yYWdlXG4gICAgY29uc3QgY29udHJhY3RzQnVja2V0ID0gbmV3IHMzLkJ1Y2tldCh0aGlzLCAnQ29udHJhY3RzQnVja2V0Jywge1xuICAgICAgYnVja2V0TmFtZTogJ29pbC1nYXMtY29udHJhY3RzLScgKyBjZGsuQXdzLkFDQ09VTlRfSUQgKyAnLScgKyBjZGsuQXdzLlJFR0lPTixcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICBhdXRvRGVsZXRlT2JqZWN0czogdHJ1ZSxcbiAgICAgIGNvcnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGFsbG93ZWRNZXRob2RzOiBbXG4gICAgICAgICAgICBzMy5IdHRwTWV0aG9kcy5HRVQsXG4gICAgICAgICAgICBzMy5IdHRwTWV0aG9kcy5QT1NULFxuICAgICAgICAgICAgczMuSHR0cE1ldGhvZHMuUFVULFxuICAgICAgICAgICAgczMuSHR0cE1ldGhvZHMuREVMRVRFLFxuICAgICAgICAgIF0sXG4gICAgICAgICAgYWxsb3dlZE9yaWdpbnM6IFsnKiddLFxuICAgICAgICAgIGFsbG93ZWRIZWFkZXJzOiBbJyonXSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSk7XG5cbiAgICAvLyBDb2duaXRvIFVzZXIgUG9vbFxuICAgIGNvbnN0IHVzZXJQb29sID0gbmV3IGNvZ25pdG8uVXNlclBvb2wodGhpcywgJ0NvbnRyYWN0QW5hbHl6ZXJVc2VyUG9vbCcsIHtcbiAgICAgIHVzZXJQb29sTmFtZTogJ2NvbnRyYWN0LWFuYWx5emVyLXVzZXJzJyxcbiAgICAgIHNlbGZTaWduVXBFbmFibGVkOiB0cnVlLFxuICAgICAgc2lnbkluQWxpYXNlczogeyBlbWFpbDogdHJ1ZSB9LFxuICAgICAgYXV0b1ZlcmlmeTogeyBlbWFpbDogdHJ1ZSB9LFxuICAgICAgc3RhbmRhcmRBdHRyaWJ1dGVzOiB7XG4gICAgICAgIGVtYWlsOiB7XG4gICAgICAgICAgcmVxdWlyZWQ6IHRydWUsXG4gICAgICAgICAgbXV0YWJsZTogdHJ1ZSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICBwYXNzd29yZFBvbGljeToge1xuICAgICAgICBtaW5MZW5ndGg6IDgsXG4gICAgICAgIHJlcXVpcmVMb3dlcmNhc2U6IHRydWUsXG4gICAgICAgIHJlcXVpcmVVcHBlcmNhc2U6IHRydWUsXG4gICAgICAgIHJlcXVpcmVEaWdpdHM6IHRydWUsXG4gICAgICAgIHJlcXVpcmVTeW1ib2xzOiBmYWxzZSxcbiAgICAgIH0sXG4gICAgICBhY2NvdW50UmVjb3Zlcnk6IGNvZ25pdG8uQWNjb3VudFJlY292ZXJ5LkVNQUlMX09OTFksXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgIH0pO1xuXG4gICAgLy8gQ29nbml0byBVc2VyIFBvb2wgQ2xpZW50XG4gICAgY29uc3QgdXNlclBvb2xDbGllbnQgPSBuZXcgY29nbml0by5Vc2VyUG9vbENsaWVudCh0aGlzLCAnQ29udHJhY3RBbmFseXplclVzZXJQb29sQ2xpZW50Jywge1xuICAgICAgdXNlclBvb2wsXG4gICAgICBhdXRoRmxvd3M6IHtcbiAgICAgICAgYWRtaW5Vc2VyUGFzc3dvcmQ6IHRydWUsXG4gICAgICAgIGN1c3RvbTogdHJ1ZSxcbiAgICAgICAgdXNlclNycDogdHJ1ZSxcbiAgICAgIH0sXG4gICAgICBzdXBwb3J0ZWRJZGVudGl0eVByb3ZpZGVyczogW2NvZ25pdG8uVXNlclBvb2xDbGllbnRJZGVudGl0eVByb3ZpZGVyLkNPR05JVE9dLFxuICAgIH0pO1xuXG4gICAgLy8gQ29nbml0byBJZGVudGl0eSBQb29sXG4gICAgY29uc3QgaWRlbnRpdHlQb29sID0gbmV3IGNvZ25pdG8uQ2ZuSWRlbnRpdHlQb29sKHRoaXMsICdDb250cmFjdEFuYWx5emVySWRlbnRpdHlQb29sJywge1xuICAgICAgYWxsb3dVbmF1dGhlbnRpY2F0ZWRJZGVudGl0aWVzOiBmYWxzZSxcbiAgICAgIGNvZ25pdG9JZGVudGl0eVByb3ZpZGVyczogW1xuICAgICAgICB7XG4gICAgICAgICAgY2xpZW50SWQ6IHVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsXG4gICAgICAgICAgcHJvdmlkZXJOYW1lOiB1c2VyUG9vbC51c2VyUG9vbFByb3ZpZGVyTmFtZSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSk7XG5cbiAgICAvLyBJQU0gcm9sZSBmb3IgYXV0aGVudGljYXRlZCB1c2Vyc1xuICAgIGNvbnN0IGF1dGhlbnRpY2F0ZWRSb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsICdDb2duaXRvRGVmYXVsdEF1dGhlbnRpY2F0ZWRSb2xlJywge1xuICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLkZlZGVyYXRlZFByaW5jaXBhbChcbiAgICAgICAgJ2NvZ25pdG8taWRlbnRpdHkuYW1hem9uYXdzLmNvbScsXG4gICAgICAgIHtcbiAgICAgICAgICBTdHJpbmdFcXVhbHM6IHtcbiAgICAgICAgICAgICdjb2duaXRvLWlkZW50aXR5LmFtYXpvbmF3cy5jb206YXVkJzogaWRlbnRpdHlQb29sLnJlZixcbiAgICAgICAgICB9LFxuICAgICAgICAgICdGb3JBbnlWYWx1ZTpTdHJpbmdMaWtlJzoge1xuICAgICAgICAgICAgJ2NvZ25pdG8taWRlbnRpdHkuYW1hem9uYXdzLmNvbTphbXInOiAnYXV0aGVudGljYXRlZCcsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgJ3N0czpBc3N1bWVSb2xlV2l0aFdlYklkZW50aXR5J1xuICAgICAgKSxcbiAgICB9KTtcblxuICAgIC8vIEdyYW50IGF1dGhlbnRpY2F0ZWQgdXNlcnMgYWNjZXNzIHRvIFMzIGJ1Y2tldFxuICAgIGNvbnRyYWN0c0J1Y2tldC5ncmFudFJlYWRXcml0ZShhdXRoZW50aWNhdGVkUm9sZSk7XG5cbiAgICAvLyBHcmFudCBhdXRoZW50aWNhdGVkIHVzZXJzIGFjY2VzcyB0byBUZXh0cmFjdFxuICAgIGF1dGhlbnRpY2F0ZWRSb2xlLmFkZFRvUG9saWN5KFxuICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICAndGV4dHJhY3Q6RGV0ZWN0RG9jdW1lbnRUZXh0JyxcbiAgICAgICAgICAndGV4dHJhY3Q6QW5hbHl6ZURvY3VtZW50JyxcbiAgICAgICAgICAndGV4dHJhY3Q6U3RhcnREb2N1bWVudFRleHREZXRlY3Rpb24nLFxuICAgICAgICAgICd0ZXh0cmFjdDpHZXREb2N1bWVudFRleHREZXRlY3Rpb24nLFxuICAgICAgICBdLFxuICAgICAgICByZXNvdXJjZXM6IFsnKiddLFxuICAgICAgfSlcbiAgICApO1xuXG4gICAgLy8gR3JhbnQgYXV0aGVudGljYXRlZCB1c2VycyBhY2Nlc3MgdG8gQmVkcm9ja1xuICAgIGF1dGhlbnRpY2F0ZWRSb2xlLmFkZFRvUG9saWN5KFxuICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICAnYmVkcm9jazpJbnZva2VNb2RlbCcsXG4gICAgICAgICAgJ2JlZHJvY2s6SW52b2tlTW9kZWxXaXRoUmVzcG9uc2VTdHJlYW0nLFxuICAgICAgICBdLFxuICAgICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgICAvLyBJbmZlcmVuY2UgcHJvZmlsZSBBUk4gKHRoaXMgaXMgcmVnaW9uLXNwZWNpZmljKVxuICAgICAgICAgIGBhcm46YXdzOmJlZHJvY2s6JHtjZGsuQXdzLlJFR0lPTn06JHtjZGsuQXdzLkFDQ09VTlRfSUR9OmluZmVyZW5jZS1wcm9maWxlL3VzLmFudGhyb3BpYy5jbGF1ZGUtc29ubmV0LTQtMjAyNTA1MTQtdjE6MGAsXG4gICAgICAgICAgXG4gICAgICAgICAgLy8gRm91bmRhdGlvbiBtb2RlbHMgaW4gYWxsIHJlZ2lvbnMgdGhhdCB0aGUgQ2xhdWRlIDQgU29ubmV0IGluZmVyZW5jZSBwcm9maWxlIGNhbiByb3V0ZSB0b1xuICAgICAgICAgIC8vIHVzLWVhc3QtMSBtb2RlbHNcbiAgICAgICAgICAnYXJuOmF3czpiZWRyb2NrOnVzLWVhc3QtMTo6Zm91bmRhdGlvbi1tb2RlbC9hbnRocm9waWMuY2xhdWRlLXNvbm5ldC00LTIwMjUwNTE0LXYxOjAnLFxuICAgICAgICAgICdhcm46YXdzOmJlZHJvY2s6dXMtZWFzdC0xOjpmb3VuZGF0aW9uLW1vZGVsL2FudGhyb3BpYy5jbGF1ZGUtMy1zb25uZXQtMjAyNDAyMjktdjE6MCcsXG4gICAgICAgICAgJ2Fybjphd3M6YmVkcm9jazp1cy1lYXN0LTE6OmZvdW5kYXRpb24tbW9kZWwvYW50aHJvcGljLmNsYXVkZS0zLWhhaWt1LTIwMjQwMzA3LXYxOjAnLFxuICAgICAgICAgICdhcm46YXdzOmJlZHJvY2s6dXMtZWFzdC0xOjpmb3VuZGF0aW9uLW1vZGVsL2FtYXpvbi50aXRhbi10ZXh0LWV4cHJlc3MtdjEnLFxuICAgICAgICAgIFxuICAgICAgICAgIC8vIHVzLWVhc3QtMiBtb2RlbHMgKENsYXVkZSA0IFNvbm5ldCBpbmZlcmVuY2UgcHJvZmlsZSBjYW4gcm91dGUgaGVyZSlcbiAgICAgICAgICAnYXJuOmF3czpiZWRyb2NrOnVzLWVhc3QtMjo6Zm91bmRhdGlvbi1tb2RlbC9hbnRocm9waWMuY2xhdWRlLXNvbm5ldC00LTIwMjUwNTE0LXYxOjAnLFxuICAgICAgICAgICdhcm46YXdzOmJlZHJvY2s6dXMtZWFzdC0yOjpmb3VuZGF0aW9uLW1vZGVsL2FudGhyb3BpYy5jbGF1ZGUtMy1zb25uZXQtMjAyNDAyMjktdjE6MCcsXG4gICAgICAgICAgJ2Fybjphd3M6YmVkcm9jazp1cy1lYXN0LTI6OmZvdW5kYXRpb24tbW9kZWwvYW50aHJvcGljLmNsYXVkZS0zLWhhaWt1LTIwMjQwMzA3LXYxOjAnLFxuICAgICAgICAgICdhcm46YXdzOmJlZHJvY2s6dXMtZWFzdC0yOjpmb3VuZGF0aW9uLW1vZGVsL2FtYXpvbi50aXRhbi10ZXh0LWV4cHJlc3MtdjEnLFxuICAgICAgICAgIFxuICAgICAgICAgIC8vIHVzLXdlc3QtMiBtb2RlbHMgKENsYXVkZSA0IFNvbm5ldCBpbmZlcmVuY2UgcHJvZmlsZSBjYW4gcm91dGUgaGVyZSlcbiAgICAgICAgICAnYXJuOmF3czpiZWRyb2NrOnVzLXdlc3QtMjo6Zm91bmRhdGlvbi1tb2RlbC9hbnRocm9waWMuY2xhdWRlLXNvbm5ldC00LTIwMjUwNTE0LXYxOjAnLFxuICAgICAgICAgICdhcm46YXdzOmJlZHJvY2s6dXMtd2VzdC0yOjpmb3VuZGF0aW9uLW1vZGVsL2FudGhyb3BpYy5jbGF1ZGUtMy1zb25uZXQtMjAyNDAyMjktdjE6MCcsXG4gICAgICAgICAgJ2Fybjphd3M6YmVkcm9jazp1cy13ZXN0LTI6OmZvdW5kYXRpb24tbW9kZWwvYW50aHJvcGljLmNsYXVkZS0zLWhhaWt1LTIwMjQwMzA3LXYxOjAnLFxuICAgICAgICAgICdhcm46YXdzOmJlZHJvY2s6dXMtd2VzdC0yOjpmb3VuZGF0aW9uLW1vZGVsL2FtYXpvbi50aXRhbi10ZXh0LWV4cHJlc3MtdjEnLFxuICAgICAgICBdLFxuICAgICAgfSlcbiAgICApO1xuXG4gICAgLy8gQXR0YWNoIHRoZSBhdXRoZW50aWNhdGVkIHJvbGUgdG8gdGhlIGlkZW50aXR5IHBvb2xcbiAgICBuZXcgY29nbml0by5DZm5JZGVudGl0eVBvb2xSb2xlQXR0YWNobWVudCh0aGlzLCAnSWRlbnRpdHlQb29sUm9sZUF0dGFjaG1lbnQnLCB7XG4gICAgICBpZGVudGl0eVBvb2xJZDogaWRlbnRpdHlQb29sLnJlZixcbiAgICAgIHJvbGVzOiB7XG4gICAgICAgIGF1dGhlbnRpY2F0ZWQ6IGF1dGhlbnRpY2F0ZWRSb2xlLnJvbGVBcm4sXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gTGFtYmRhIGZ1bmN0aW9uIGZvciBjb250cmFjdCBwcm9jZXNzaW5nXG4gICAgY29uc3QgY29udHJhY3RQcm9jZXNzb3JGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0NvbnRyYWN0UHJvY2Vzc29yJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuUFlUSE9OXzNfMTAsXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tSW5saW5lKGBcbmltcG9ydCBqc29uXG5pbXBvcnQgYm90bzNcbmltcG9ydCBiYXNlNjRcblxuZGVmIGhhbmRsZXIoZXZlbnQsIGNvbnRleHQpOlxuICAgIHRleHRyYWN0ID0gYm90bzMuY2xpZW50KCd0ZXh0cmFjdCcpXG4gICAgYmVkcm9jayA9IGJvdG8zLmNsaWVudCgnYmVkcm9jay1ydW50aW1lJylcblxuICAgIHRyeTpcbiAgICAgICAgIyBFeHRyYWN0IHRleHQgZnJvbSBkb2N1bWVudCB1c2luZyBUZXh0cmFjdFxuICAgICAgICAjIFRoaXMgaXMgYSBzaW1wbGlmaWVkIGV4YW1wbGUgLSB5b3Ugd291bGQgaW1wbGVtZW50IGZ1bGwgcHJvY2Vzc2luZyBoZXJlXG5cbiAgICAgICAgcmVzcG9uc2UgPSB7XG4gICAgICAgICAgICAnc3RhdHVzQ29kZSc6IDIwMCxcbiAgICAgICAgICAgICdib2R5JzoganNvbi5kdW1wcyh7XG4gICAgICAgICAgICAgICAgJ21lc3NhZ2UnOiAnQ29udHJhY3QgcHJvY2Vzc2VkIHN1Y2Nlc3NmdWxseScsXG4gICAgICAgICAgICAgICAgJ2FuYWx5c2lzJzoge1xuICAgICAgICAgICAgICAgICAgICAnbGVzc29ycyc6IFsnU2FtcGxlIExlc3NvciddLFxuICAgICAgICAgICAgICAgICAgICAnbGVzc2Vlcyc6IFsnU2FtcGxlIExlc3NlZSddLFxuICAgICAgICAgICAgICAgICAgICAnYWNyZWFnZSc6ICcxNjAgYWNyZXMnLFxuICAgICAgICAgICAgICAgICAgICAnZGVwdGhzJzogJ0FsbCBmb3JtYXRpb25zJyxcbiAgICAgICAgICAgICAgICAgICAgJ3Rlcm0nOiAnNSB5ZWFycycsXG4gICAgICAgICAgICAgICAgICAgICdyb3lhbHR5JzogJzEyLjUlJyxcbiAgICAgICAgICAgICAgICAgICAgJ2luc2lnaHRzJzogWydTdGFuZGFyZCB0ZXJtcyBmb3IgdGhpcyByZWdpb24nXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzcG9uc2VcblxuICAgIGV4Y2VwdCBFeGNlcHRpb24gYXMgZTpcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICdzdGF0dXNDb2RlJzogNTAwLFxuICAgICAgICAgICAgJ2JvZHknOiBqc29uLmR1bXBzKHsnZXJyb3InOiBzdHIoZSl9KVxuICAgICAgICB9XG4gICAgICBgKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIENPTlRSQUNUU19CVUNLRVQ6IGNvbnRyYWN0c0J1Y2tldC5idWNrZXROYW1lLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIEdyYW50IExhbWJkYSBmdW5jdGlvbiBwZXJtaXNzaW9uc1xuICAgIGNvbnRyYWN0c0J1Y2tldC5ncmFudFJlYWRXcml0ZShjb250cmFjdFByb2Nlc3NvckZ1bmN0aW9uKTtcbiAgICBjb250cmFjdFByb2Nlc3NvckZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShcbiAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgJ3RleHRyYWN0OkRldGVjdERvY3VtZW50VGV4dCcsXG4gICAgICAgICAgJ3RleHRyYWN0OkFuYWx5emVEb2N1bWVudCcsXG4gICAgICAgICAgJ2JlZHJvY2s6SW52b2tlTW9kZWwnLFxuICAgICAgICBdLFxuICAgICAgICByZXNvdXJjZXM6IFsnKiddLFxuICAgICAgfSlcbiAgICApO1xuXG4gICAgLy8gQVBJIEdhdGV3YXlcbiAgICBjb25zdCBhcGkgPSBuZXcgYXBpZ2F0ZXdheS5SZXN0QXBpKHRoaXMsICdDb250cmFjdEFuYWx5emVyQXBpJywge1xuICAgICAgcmVzdEFwaU5hbWU6ICdDb250cmFjdCBBbmFseXplciBBUEknLFxuICAgICAgZGVzY3JpcHRpb246ICdBUEkgZm9yIHByb2Nlc3Npbmcgb2lsIGFuZCBnYXMgbGVhc2UgY29udHJhY3RzJyxcbiAgICAgIGRlZmF1bHRDb3JzUHJlZmxpZ2h0T3B0aW9uczoge1xuICAgICAgICBhbGxvd09yaWdpbnM6IGFwaWdhdGV3YXkuQ29ycy5BTExfT1JJR0lOUyxcbiAgICAgICAgYWxsb3dNZXRob2RzOiBhcGlnYXRld2F5LkNvcnMuQUxMX01FVEhPRFMsXG4gICAgICAgIGFsbG93SGVhZGVyczogWydDb250ZW50LVR5cGUnLCAnWC1BbXotRGF0ZScsICdBdXRob3JpemF0aW9uJywgJ1gtQXBpLUtleSddLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGNvbnRyYWN0c1Jlc291cmNlID0gYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2NvbnRyYWN0cycpO1xuICAgIGNvbnN0IHByb2Nlc3NSZXNvdXJjZSA9IGNvbnRyYWN0c1Jlc291cmNlLmFkZFJlc291cmNlKCdwcm9jZXNzJyk7XG5cbiAgICBwcm9jZXNzUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oY29udHJhY3RQcm9jZXNzb3JGdW5jdGlvbikpO1xuXG4gICAgLy8gT3V0cHV0c1xuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdVc2VyUG9vbElkJywge1xuICAgICAgdmFsdWU6IHVzZXJQb29sLnVzZXJQb29sSWQsXG4gICAgICBkZXNjcmlwdGlvbjogJ0NvZ25pdG8gVXNlciBQb29sIElEJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdVc2VyUG9vbENsaWVudElkJywge1xuICAgICAgdmFsdWU6IHVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsXG4gICAgICBkZXNjcmlwdGlvbjogJ0NvZ25pdG8gVXNlciBQb29sIENsaWVudCBJRCcsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnSWRlbnRpdHlQb29sSWQnLCB7XG4gICAgICB2YWx1ZTogaWRlbnRpdHlQb29sLnJlZixcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ29nbml0byBJZGVudGl0eSBQb29sIElEJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdDb250cmFjdHNCdWNrZXROYW1lJywge1xuICAgICAgdmFsdWU6IGNvbnRyYWN0c0J1Y2tldC5idWNrZXROYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICdTMyBCdWNrZXQgZm9yIGNvbnRyYWN0IHN0b3JhZ2UnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FwaUdhdGV3YXlVcmwnLCB7XG4gICAgICB2YWx1ZTogYXBpLnVybCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVBJIEdhdGV3YXkgVVJMJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdSZWdpb24nLCB7XG4gICAgICB2YWx1ZTogY2RrLkF3cy5SRUdJT04sXG4gICAgICBkZXNjcmlwdGlvbjogJ0FXUyBSZWdpb24nLFxuICAgIH0pO1xuICB9XG59XG4iXX0=