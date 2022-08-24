import { App } from 'aws-cdk-lib';
import { HttpApiLambdaPolly } from './httpapi-lambda-polly/stack';
import { RestApiLambdaDynamoDB } from './restapi-lambda-dynamodb/stack';
import { RestApiStepFunctionsExpressSync } from './restapi-stepfunctions-express-sync/stack';
import { StepFunctionsStandardDynamoDB } from './stepfunctions-standard-dynamodb/stack';

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

new HttpApiLambdaPolly(app, 'HttpApiLambdaPolly', { env: devEnv });
new RestApiLambdaDynamoDB(app, 'RestApiLambdaDynamoDB', { env: devEnv });
new RestApiStepFunctionsExpressSync(app, 'RestApiStepFunctionsExpressSync', { env: devEnv });
new StepFunctionsStandardDynamoDB(app, 'StepFunctionsStandardDynamoDB', { env: devEnv });

app.synth();