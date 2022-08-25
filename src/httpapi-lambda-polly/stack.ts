import { join } from 'path';
import { HttpApi, HttpMethod } from '@aws-cdk/aws-apigatewayv2-alpha';
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Architecture, Tracing } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

export class HttpApiLambdaPolly extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    const pollyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: ['*'],
      actions: ['polly:SynthesizeSpeech'],
    });

    const lambda = new NodejsFunction(this, 'PollyLambda', {
      functionName: 'playing-with-polly',
      architecture: Architecture.ARM_64,
      entry: join(__dirname, 'lambda-fns/index.ts'),
      handler: 'handler',
      timeout: Duration.seconds(30),
      tracing: Tracing.ACTIVE,
    });
    lambda.addToRolePolicy(pollyStatement);

    const rest = new HttpApi(this, 'PollyHttpApi', {
      apiName: 'polly-httpapi',
    });
    rest.addRoutes({
      path: '/speech/{voice}',
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration('Integration', lambda),
    });
  }
}