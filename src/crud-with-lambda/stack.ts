import { join } from 'path';
import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { JsonSchema, JsonSchemaType, JsonSchemaVersion, LambdaIntegration, MethodOptions, Model, RequestValidator, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { AttributeType, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Tracing } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

export class CrudWithLambda extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    const table = new Table(this, 'Table', {
      partitionKey: { name: 'account', type: AttributeType.NUMBER },
      sortKey: { name: 'transactId', type: AttributeType.STRING },
      tableName: 'crud-with-lambda',
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const nodejsFunctionProps: NodejsFunctionProps = {
      handler: 'handler',
      tracing: Tracing.ACTIVE,
      environment: {
        TABLE_NAME: table.tableName,
        SORT_KEY: 'transactId',
        PARTITION_KEY: 'account',
      },
    };

    const lambdaInsert = new NodejsFunction(this, 'LambdaInsert', {
      entry: join(__dirname, 'lambda-fns/insert.ts'),
      functionName: 'crud-with-lambda-insert',
      ...nodejsFunctionProps,
    });
    const lambdaScan = new NodejsFunction(this, 'LambdaScan', {
      entry: join(__dirname, 'lambda-fns/scan.ts'),
      functionName: 'crud-with-lambda-scan',
      ...nodejsFunctionProps,
    });
    const lambdaQuery = new NodejsFunction(this, 'LambdaQuery', {
      entry: join(__dirname, 'lambda-fns/query.ts'),
      functionName: 'crud-lambda-dynamodb-query',
      ...nodejsFunctionProps,
    });
    const lambdaDelete = new NodejsFunction(this, 'LambdaDelete', {
      entry: join(__dirname, 'lambda-fns/delete.ts'),
      functionName: 'crud-lambda-dynamodb-delete',
      ...nodejsFunctionProps,
    });
    const lambdaPatch = new NodejsFunction(this, 'LambdaPatch', {
      entry: join(__dirname, 'lambda-fns/patch.ts'),
      functionName: 'crud-lambda-dynamodb-patch',
      ...nodejsFunctionProps,
    });

    table.grantWriteData(lambdaInsert);
    table.grantReadData(lambdaScan);
    table.grantReadData(lambdaQuery);
    table.grantWriteData(lambdaDelete);
    table.grantWriteData(lambdaPatch);

    const rest = new RestApi(this, 'RestApi', {
      restApiName: 'crud-with-lambda',
      deployOptions: { tracingEnabled: true },
    });

    const schemaPost: JsonSchema = {
      title: 'crud-with-lambda-post',
      type: JsonSchemaType.OBJECT,
      schema: JsonSchemaVersion.DRAFT4,
      required: ['account', 'type', 'value'],
      properties: {
        account: { type: JsonSchemaType.NUMBER },
        type: { type: JsonSchemaType.STRING },
        value: { type: JsonSchemaType.NUMBER },
      },
    };
    const modelPost = new Model(this, 'Model', {
      restApi: rest,
      schema: schemaPost,
      contentType: 'application/json',
    });
    const validatePost = new RequestValidator(this, 'RequestValidator', {
      requestValidatorName: 'crud-with-lambda-post',
      restApi: rest,
      validateRequestBody: true,
    });
    const methodPost: MethodOptions = {
      requestModels: { 'application/json': modelPost },
      requestValidator: validatePost,
    };

    const validateId = new RequestValidator(this, 'RequestValidatorId', {
      requestValidatorName: 'crud-with-lambda-id',
      restApi: rest,
      validateRequestParameters: true,
    });
    const methodId: MethodOptions = {
      requestParameters: {
        'method.request.querystring.transactId': true,
      },
      requestValidator: validateId,
    };

    const items = rest.root.addResource('items');
    items.addMethod('POST', new LambdaIntegration(lambdaInsert), methodPost);
    items.addMethod('GET', new LambdaIntegration(lambdaScan));

    const idItem = items.addResource('{account}');
    idItem.addMethod('GET', new LambdaIntegration(lambdaQuery), methodId);
    idItem.addMethod('DELETE', new LambdaIntegration(lambdaDelete));
    idItem.addMethod('PATCH', new LambdaIntegration(lambdaPatch));
  }
}