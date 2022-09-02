import { join } from 'path';
import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { JsonSchema, JsonSchemaType, JsonSchemaVersion, LambdaIntegration, MethodOptions, Model, RequestValidator, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { AttributeType, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Tracing } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';

export class CrudWithLambda extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    const table = new Table(this, 'Table', {
      partitionKey: { name: 'pk', type: AttributeType.STRING },
      sortKey: { name: 'sk', type: AttributeType.STRING },
      tableName: 'crud-with-lambda',
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const nodejsFunctionProps: NodejsFunctionProps = {
      handler: 'handler',
      tracing: Tracing.ACTIVE,
      environment: {
        TABLE_NAME: table.tableName,
        SORT_KEY: 'sk',
        PARTITION_KEY: 'pk',
      },
    };

    const lambdaPutItem = new NodejsFunction(this, 'LambdaPutItem', {
      entry: join(__dirname, 'lambda-fns/put-item.ts'),
      functionName: 'crud-with-lambda-put-item',
      ...nodejsFunctionProps,
    });
    const lambdaScan = new NodejsFunction(this, 'LambdaScan', {
      entry: join(__dirname, 'lambda-fns/scan.ts'),
      functionName: 'crud-with-lambda-scan',
      ...nodejsFunctionProps,
    });
    const lambdaGetItem = new NodejsFunction(this, 'LambdaGetItem', {
      entry: join(__dirname, 'lambda-fns/get-item.ts'),
      functionName: 'crud-lambda-dynamodb-get-item',
      ...nodejsFunctionProps,
    });
    const lambdaDeleteItem = new NodejsFunction(this, 'LambdaDeleteItem', {
      entry: join(__dirname, 'lambda-fns/delete-item.ts'),
      functionName: 'crud-lambda-dynamodb-delete-item',
      ...nodejsFunctionProps,
    });
    const lambdaUpdateItem = new NodejsFunction(this, 'LambdaUpdateItem', {
      entry: join(__dirname, 'lambda-fns/update-item.ts'),
      functionName: 'crud-lambda-dynamodb-update-item',
      ...nodejsFunctionProps,
    });    
    const lambdaQuery = new NodejsFunction(this, 'lambdaQuery', {
      entry: join(__dirname, 'lambda-fns/query.ts'),
      functionName: 'crud-lambda-dynamodb-query',
      ...nodejsFunctionProps,
    });

    table.grantWriteData(lambdaPutItem);
    table.grantReadData(lambdaScan);
    table.grantReadData(lambdaGetItem);
    table.grantWriteData(lambdaDeleteItem);
    table.grantWriteData(lambdaUpdateItem);
    table.grantReadData(lambdaQuery);

    const dynamodbNoAmountStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [table.tableArn, table.tableArn + '/index/*'],
      actions: ['dynamodb:Query', 'dynamodb:GetItem', 'dynamodb:BatchGetItem'],
    });
    dynamodbNoAmountStatement.addConditions({
      StringEqualsIfExists: {
        'dynamodb:Select': 'SPECIFIC_ATTRIBUTES',
      },
      'ForAllValues:StringLike': {
        'dynamodb:Attributes': ['pk', 'sk', 'description']
      }
    })

    const lambdaQueryNoAmount = new NodejsFunction(this, 'lambdaQueryNoAmount', {
      entry: join(__dirname, 'lambda-fns/query-no-amount.ts'),
      functionName: 'crud-lambda-dynamodb-query-no-amount',
      ...nodejsFunctionProps,
    });
    lambdaQuery.addToRolePolicy(dynamodbNoAmountStatement);
    const lambdaGetItemNoAmount = new NodejsFunction(this, 'LambdaGetItemNoAmount', {
      entry: join(__dirname, 'lambda-fns/get-item-no-amount.ts'),
      functionName: 'crud-lambda-dynamodb-get-item-no-amount',
      ...nodejsFunctionProps,
    });

    lambdaQueryNoAmount.addToRolePolicy(dynamodbNoAmountStatement);
    lambdaGetItemNoAmount.addToRolePolicy(dynamodbNoAmountStatement);

    const rest = new RestApi(this, 'RestApi', {
      restApiName: 'crud-with-lambda',
      deployOptions: { tracingEnabled: true },
    });

    const schemaPost: JsonSchema = {
      title: 'crud-with-lambda-post',
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
        'method.request.querystring.transaction': true,
      },
      requestValidator: validateId,
    };

    const deleteItem = rest.root.addResource('delete-item');
    const idDeleteItem = deleteItem.addResource('{account}');
    idDeleteItem.addMethod('DELETE', new LambdaIntegration(lambdaDeleteItem));

    const getItem = rest.root.addResource('get-item');
    const idGetItem = getItem.addResource('{account}');
    idGetItem.addMethod('GET', new LambdaIntegration(lambdaGetItem), methodId);

    const getItemNoAmount = rest.root.addResource('get-item-no-amount');
    const idGetItemNoAmount = getItemNoAmount.addResource('{account}');
    idGetItemNoAmount.addMethod('GET', new LambdaIntegration(lambdaGetItemNoAmount), methodId);

    const putItem = rest.root.addResource('put-item');
    putItem.addMethod('POST', new LambdaIntegration(lambdaPutItem), methodPost);

    const query = rest.root.addResource('query');
    const idQuery = query.addResource('{account}');
    idQuery.addMethod('GET', new LambdaIntegration(lambdaQuery), methodId);

    const queryNoAmount = rest.root.addResource('query-no-amount');
    const idQueryNoAmount = queryNoAmount.addResource('{account}');
    idQueryNoAmount.addMethod('GET', new LambdaIntegration(lambdaQueryNoAmount), methodId);    

    const scan = rest.root.addResource('scan');
    scan.addMethod('GET', new LambdaIntegration(lambdaScan));

    const updateItem = rest.root.addResource('update-item');
    const idUpdateItem = updateItem.addResource('{account}');
    idUpdateItem.addMethod('PATCH', new LambdaIntegration(lambdaUpdateItem));
  }
}