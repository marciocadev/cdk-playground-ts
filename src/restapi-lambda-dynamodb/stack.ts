import { join } from 'path';
import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { AttributeType, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Tracing } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

export class RestApiLambdaDynamoDB extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    const table = new Table(this, 'Table', {
      partitionKey: { name: 'id', type: AttributeType.STRING },
      tableName: 'restapi-lambda-dynamodb',
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const lambdaPost = new NodejsFunction(this, 'LambdaPost', {
      entry: join(__dirname, 'lambda-fns/post/index.ts'),
      handler: 'handler',
      functionName: 'restapi-lambda-dynamodb-post',
      environment: {
        TABLE_NAME: table.tableName,
      },
      tracing: Tracing.ACTIVE,
    });

    table.grantWriteData(lambdaPost);

    const rest = new RestApi(this, 'RestApi', {
      restApiName: 'restapi-lambda-dynamodb',
      deployOptions: {
        tracingEnabled: true,
      },
    });
    const resource = rest.root.addResource('api');
    resource.addMethod('POST', new LambdaIntegration(lambdaPost));
  }
}