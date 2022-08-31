import { join } from 'path';
import { CfnParameter, Fn, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export class SecretManagerCaching extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    const numberParam = new CfnParameter(this, 'Secret1', {
      type: 'Number',
      minValue: 1,
      maxValue: 100,
    });
    console.log('numberParam 👉', numberParam.valueAsNumber);

    const stringParam = new CfnParameter(this, 'Secret2', {
      type: 'String',
    });
    console.log('stringParam 👉 ', stringParam.valueAsString);

    const commaDelimitedListParam = new CfnParameter(this, 'Secret3', {
      type: 'CommaDelimitedList',
    });
    console.log('commaDelimitedListParam 👉 ', commaDelimitedListParam.valueAsList);

    const secretJson = JSON.stringify({
      'super-secret-number': numberParam.valueAsNumber,
      'super-secret-string': stringParam.valueAsString,
      'super-secret-comma-delimiter-0': Fn.select(0, commaDelimitedListParam.valueAsList),
      'super-secret-comma-delimiter-1': Fn.select(1, commaDelimitedListParam.valueAsList),
    });

    const secret = new Secret(this, 'Secret', {
      secretName: 'secret-manager-caching',
      removalPolicy: RemovalPolicy.DESTROY,
      generateSecretString: {
        generateStringKey: 'generateStringKey',
        secretStringTemplate: secretJson,
      },
    });

    const lambda = new NodejsFunction(this, 'Lambda', {
      functionName: 'secret-manager-caching',
      entry: join(__dirname, 'lambda-fns/index.ts'),
      handler: 'handler',
      environment: {
        SECRET: secret.secretArn,
      },
    });
    secret.grantRead(lambda);
  }
}