import { awscdk } from 'projen';
const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: '2.38.0',
  defaultReleaseBranch: 'main',
  name: 'cdk-playground-ts',
  projenrcTs: true,

  deps: [
    '@types/aws-lambda',
    '@aws-lambda-powertools/logger',
    '@aws-lambda-powertools/tracer',
    '@aws-sdk/util-dynamodb',
    '@aws-sdk/client-dynamodb',
    '@aws-sdk/client-polly',
    '@aws-cdk/aws-apigatewayv2-alpha',
    '@aws-cdk/aws-apigatewayv2-integrations-alpha',
  ],
});
project.synth();