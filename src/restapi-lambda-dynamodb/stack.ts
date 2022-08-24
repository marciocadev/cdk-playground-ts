import { RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import { AttributeType, Table } from "aws-cdk-lib/aws-dynamodb";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import { join } from "path";

export class RestApiLambdaDynamoDB extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    const table = new Table(this, 'Table', {
      partitionKey: { name: 'id', type: AttributeType.STRING },
      tableName: 'gateway-lambda-dynamodb',
      removalPolicy: RemovalPolicy.DESTROY
    });
    
    const lambdaPost = new NodejsFunction(this, 'LambdaPost', {
      entry: join(__dirname, 'lambda-fns/post/index.ts'),
      handler: 'handler',
      functionName: 'gateway-lambda-dynamodb-post',
      environment: {
        'TABLE_NAME': table.tableName
      },
    });
    
    table.grantWriteData(lambdaPost);

    const rest = new RestApi(this, 'Gateway', {
      restApiName: 'gateway-lambda-dynamodb'
    });
    const resource = rest.root.addResource('api');
    resource.addMethod('POST', new LambdaIntegration(lambdaPost));
  }
}