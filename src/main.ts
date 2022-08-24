import { App } from 'aws-cdk-lib';
import { RestApiLambdaDynamo } from './restapi-lambda-dynamo/stack';
import { RestApiStepFunctionsExpressSync } from './restapi-stepfunctions-express-sync/stack';

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

new RestApiLambdaDynamo(app, 'RestApiLambdaDynamo', { env: devEnv });
new RestApiStepFunctionsExpressSync(app, 'RestApiStepFunctionsExpressSync', { env: devEnv });

app.synth();