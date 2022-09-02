import { join } from 'path';
import { Aws, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { AwsIntegration, IntegrationOptions, JsonSchema, JsonSchemaType, JsonSchemaVersion, MethodLoggingLevel, MethodOptions, Model, RequestValidator, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { AttributeType, StreamViewType, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { StartingPosition, Tracing } from 'aws-cdk-lib/aws-lambda';
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { NodejsFunction, NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

export class CrudWithDynamoDB extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    const gtwTableRole = new Role(this, 'ApiGatewayDynamoDBRole', {
      assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
    });

    const table = new Table(this, 'Table', {
      partitionKey: { name: 'pk', type: AttributeType.STRING },
      sortKey: { name: 'sk', type: AttributeType.STRING },
      tableName: 'crud-with-dynamodb',
      removalPolicy: RemovalPolicy.DESTROY,
      stream: StreamViewType.NEW_IMAGE,
    });
    table.grantWriteData(gtwTableRole);

    const nodejsFunctionProps: NodejsFunctionProps = {
      handler: 'handler',
      tracing: Tracing.ACTIVE,
      retryAttempts: 0,
      environment: {
        TABLE_NAME: table.tableName,
        SORT_KEY: 'sk',
        PARTITION_KEY: 'pk',
      },
    };
    const lambdaInsert = new NodejsFunction(this, 'LambdaInsert', {
      entry: join(__dirname, 'lambda-fns/insert.ts'),
      functionName: 'crud-with-dynamodb-insert',
      ...nodejsFunctionProps,
    });
    lambdaInsert.addEventSource(new DynamoEventSource(table, {
      startingPosition: StartingPosition.LATEST,
      
    }));
    table.grantWriteData(lambdaInsert);

    const integrationOpt: IntegrationOptions = {
      credentialsRole: gtwTableRole,
      requestTemplates: {
        'application/json': `
        {
          "TableName":"${table.tableName}",
          "Item": {
            "pk":{"S":"ACCOUNT#$input.path('account')"},
            "sk":{"S":"TRANSACTION#$context.requestId"},
            "amount":{"N":"$input.path('amount')"}
          }
        }`,
      },
      integrationResponses: [
        {
          statusCode: '200',
          responseTemplates: {
            'application/json': '$context.requestId',
          },
        },
        {
          statusCode: '400',
          responseTemplates: {
            'application/json': JSON.stringify({
              state: 'error',
              message: "$util.escapeJavaScript($input.path('$.errorMessage'))",
            }),
          },
        },
      ],
    };
    const integrationPost = new AwsIntegration({
      service: 'dynamodb',
      region: `${Aws.REGION}`,
      action: 'PutItem',
      options: integrationOpt,
    });

    const rest = new RestApi(this, 'RestApi', {
      restApiName: 'crud-with-dynamodb',
      deployOptions: {
        loggingLevel: MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        tracingEnabled: true,
      },
    });

    const schemaPost: JsonSchema = {
      title: 'crud-with-dynamodb-post',
      type: JsonSchemaType.OBJECT,
      schema: JsonSchemaVersion.DRAFT4,
      required: ['account', 'amount'],
      properties: {
        account: { type: JsonSchemaType.NUMBER },
        amount: { type: JsonSchemaType.NUMBER },
      },
    };
    const modelPost = new Model(this, 'Model', {
      restApi: rest,
      schema: schemaPost,
      contentType: 'application/json',
    });
    const validatePost = new RequestValidator(this, 'RequestValidator', {
      requestValidatorName: 'crud-with-dynamodb-post',
      restApi: rest,
      validateRequestBody: true,
    });
    const methodPost: MethodOptions = {
      methodResponses: [{ statusCode: '200' }],
      requestModels: { 'application/json': modelPost },
      requestValidator: validatePost,
    };

    const items = rest.root.addResource('items');
    items.addMethod('POST', integrationPost, methodPost);
  }
}