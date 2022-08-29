import { App } from 'aws-cdk-lib';
import { CrudWithDynamoDB } from './crud-with-dynamodb/stack';
import { CrudWithLambda } from './crud-with-lambda/stack';

import { HttpApiLambdaPolly } from './httpapi-lambda-polly/stack';
import { RestApiStepFunctionsExpressSync } from './restapi-stepfunctions-express-sync/stack';
import { StepFunctionsStandardDynamoDB } from './stepfunctions-standard-dynamodb/stack';

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

new CrudWithLambda(app, 'CrudWithLambda', {
  env: devEnv,
  tags: { createdBy: 'cdk', stackName: 'CrudWithLambda' },
});
new CrudWithDynamoDB(app, 'CrudWithDynamoDB', {
  env: devEnv,
  tags: { createdBy: 'cdk', stackName: 'CrudWithDynamoDB' },
});

new HttpApiLambdaPolly(app, 'HttpApiLambdaPolly', {
  env: devEnv,
  tags: { createdBy: 'cdk', stackName: 'HttpApiLambdaPolly' },
});
new RestApiStepFunctionsExpressSync(app, 'RestApiStepFunctionsExpressSync', {
  env: devEnv,
  tags: { createdBy: 'cdk', stackName: 'RestApiStepFunctionsExpressSync' },
});
new StepFunctionsStandardDynamoDB(app, 'StepFunctionsStandardDynamoDB', {
  env: devEnv,
  tags: { createdBy: 'cdk', stackName: 'StepFunctionsStandardDynamoDB' },
});

app.synth();