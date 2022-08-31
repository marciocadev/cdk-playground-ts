import { awscdk } from 'projen';
const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: '2.39.0',
  defaultReleaseBranch: 'main',
  name: 'cdk-playground-ts',
  projenrcTs: true,

  deps: [
    'phin',
    'uuid',
    '@types/uuid',
    '@types/aws-lambda',
    '@aws-lambda-powertools/logger',
    '@aws-lambda-powertools/tracer',
    '@aws-sdk/client-lookoutequipment',
    '@aws-sdk/client-s3',
    '@aws-sdk/s3-request-presigner',
    '@aws-sdk/util-dynamodb',
    '@aws-sdk/client-dynamodb',
    '@aws-sdk/client-polly',
    '@aws-sdk/client-secrets-manager',
    '@aws-cdk/aws-apigatewayv2-alpha',
    '@aws-cdk/aws-apigatewayv2-integrations-alpha',
  ],
});
project.synth();