import { App } from 'aws-cdk-lib';
import { GatewayLambdaDynamo } from './gateway-lambda-dynamo/stack';

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

new GatewayLambdaDynamo(app, 'gateway-lambda-dynamo', { env: devEnv });

app.synth();