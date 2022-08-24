import { RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { AwsIntegration, IntegrationOptions, JsonSchema, JsonSchemaType, JsonSchemaVersion, MethodOptions, Model, RequestValidator, RestApi } from "aws-cdk-lib/aws-apigateway";
import { AttributeType, Table } from "aws-cdk-lib/aws-dynamodb";
import { Effect, Policy, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Chain, JsonPath, Map, Parallel, Pass, StateMachine, StateMachineType, TaskInput } from "aws-cdk-lib/aws-stepfunctions";
import { DynamoAttributeValue, DynamoGetItem, DynamoPutItem, DynamoUpdateItem, LambdaInvoke } from "aws-cdk-lib/aws-stepfunctions-tasks";
import { Construct } from "constructs";
import { join } from "path";

export class RestApiStepFunctionsExpressSync extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    const table = new Table(this, 'Table', {
      tableName: 'restapi-stepfunctions-express-sync',
      partitionKey: {
        name: 'pk',
        type: AttributeType.STRING,
      },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const transformNumLst = new NodejsFunction(this, 'TransformNumLst', {
      functionName: 'TransformNumLst',
      entry: join(__dirname, 'lambda-fns/transform-num-lst/index.ts'),
      handler: 'handler',
    });
    const transformNumLstStep = new LambdaInvoke(this, 'TransformNumLstStep', {
      payload: TaskInput.fromObject({
        input: JsonPath.stringAt('$'),
      }),
      lambdaFunction: transformNumLst,
      outputPath: '$.Payload',
    });
    const mapNumLst = new Map(this, 'MapNumLst', {
      inputPath: '$.numLst',
      maxConcurrency: 0,
      resultPath: '$.numLstProcess',
    });
    const transformNumLstChain = Chain.start(transformNumLstStep);
    mapNumLst.iterator(transformNumLstChain);
    const updateItemNumLst = new DynamoUpdateItem(this, 'DynamoUpdateItemNumLst', {
      key: { pk: DynamoAttributeValue.fromString(JsonPath.stringAt('$.pk')) },
      updateExpression: 'set #numLst=:numLst',
      expressionAttributeNames: {
        '#numLst': 'numLst',
      },
      expressionAttributeValues: {
        ':numLst': DynamoAttributeValue.listFromJsonPath(JsonPath.stringAt('$.numLstProcess')),
      },
      table: table,
      resultPath: JsonPath.DISCARD,
    });
    mapNumLst.next(updateItemNumLst);

    const transformMapLst = new NodejsFunction(this, 'TransformMapLst', {
      functionName: 'TransformMapLst',
      entry: join(__dirname, 'lambda-fns/transform-map-lst/index.ts'),
      handler: 'handler',
    });
    const transformMapLstStep = new LambdaInvoke(this, 'TransformMapLstStep', {
      payload: TaskInput.fromObject({ input: JsonPath.stringAt('$') }),
      lambdaFunction: transformMapLst,
      outputPath: '$.Payload',
    });
    const mapMapLst = new Map(this, 'MapMapLst', {
      inputPath: '$',
      itemsPath: '$.mapLst',
      maxConcurrency: 0,
      resultPath: '$.mapLstProcess',
    });
    const transformMapLstChain = Chain.start(transformMapLstStep);
    mapMapLst.iterator(transformMapLstChain);
    const updateItemMapLst = new DynamoUpdateItem(this, 'DynamoUpdateItemMapLst', {
      key: { pk: DynamoAttributeValue.fromString(JsonPath.stringAt('$.pk')) },
      updateExpression: 'set #mapLst=:mapLst',
      expressionAttributeNames: {
        '#mapLst': 'mapLst',
      },
      expressionAttributeValues: {
        ':mapLst': DynamoAttributeValue.listFromJsonPath(JsonPath.stringAt('$.mapLstProcess')),
      },
      table: table,
      resultPath: JsonPath.DISCARD,
    });
    mapMapLst.next(updateItemMapLst);

    const parallel = new Parallel(this, 'Parallel', {
      resultPath: JsonPath.DISCARD,
    })
    parallel.branch(mapMapLst).branch(mapNumLst);

    const pass = new Pass(this, 'Pass', {
      parameters: {
        'pk.$': '$.pk',
        'str.$': '$.str',
        'num.$': '$.num',
        'map.$': '$.map',
        'strLst.$': '$.strLst',
        'strSet.$': '$.strSet',
        'numLst.$': '$.numLst',
        'mapLst.$': '$.mapLst',
        'bool.$': '$.bool',
        'binary.$': '$.convertToBinary',
      },
    });

    const putItem = new DynamoPutItem(this, 'DynamoPutItem', {
      item: {
        pk: DynamoAttributeValue.fromString(JsonPath.stringAt('$.pk')),
        str: DynamoAttributeValue.fromString(JsonPath.stringAt('$.str')),
        num: DynamoAttributeValue.numberFromString(JsonPath.stringAt('States.JsonToString($.num)')),
        map: DynamoAttributeValue.fromMap({
          'strMap': DynamoAttributeValue.fromString(JsonPath.stringAt('$.map.strMap')),
          'numMap': DynamoAttributeValue.numberFromString(JsonPath.stringAt('States.JsonToString($.map.numMap)')),
        }),
        strLst: DynamoAttributeValue.listFromJsonPath(JsonPath.stringAt('$.strLst')),
        strSet: DynamoAttributeValue.fromStringSet(JsonPath.listAt('$.strSet')),
        bool: DynamoAttributeValue.booleanFromJsonPath(JsonPath.stringAt('$.bool')),
        binary: DynamoAttributeValue.fromBinary(JsonPath.stringAt('$.binary')),
      },
      table: table,
      resultPath: JsonPath.DISCARD,
    });

    const getItem = new DynamoGetItem(this, 'DynamoGetItem', {
      key: { pk: DynamoAttributeValue.fromString(JsonPath.stringAt('$.pk')) },
      table: table,
      outputPath: '$.Item.pk.S',
    });

    const chain = Chain.start(pass)
      .next(putItem)
      .next(parallel)
      .next(getItem);
    const stateMachine = new StateMachine(this, 'StateMachine', {
      stateMachineName: 'restapi-stepfunctions-express-sync',
      definition: chain,
      stateMachineType: StateMachineType.EXPRESS,
    });

    const servicePrincipal = new ServicePrincipal('apigateway.amazonaws.com');
    const gatewayRole = new Role(this, 'GatewayRole', { assumedBy: servicePrincipal });
    gatewayRole.attachInlinePolicy(
      new Policy(this, 'StepFunctionsPolicy', {
        statements: [
          new PolicyStatement({
            actions: ['states:StartSyncExecution'],
            effect: Effect.ALLOW,
            resources: [stateMachine.stateMachineArn]
          })
        ]
      })
    );
    const rest = new RestApi(this, 'RestApi', {
      restApiName: 'restapi-stepfunctions-express-sync'
    });
    const postSchema: JsonSchema = {
      title: 'PostSchema',
      type: JsonSchemaType.OBJECT,
      schema: JsonSchemaVersion.DRAFT4,
      required: ['str'],
      properties: {
        'str': { type: JsonSchemaType.STRING }
      }
    }
    const postModel = new Model(this, 'PostModel', {
      restApi: rest,
      contentType: 'application/json',
      schema: postSchema
    });
    const postValidator = new RequestValidator(this, 'RequestValidator', {
      requestValidatorName: 'validator',
      restApi: rest,
      validateRequestBody: true,
      validateRequestParameters: false,
    });
    const methodOpt: MethodOptions = {
      methodResponses: [{ statusCode: '200' }],
      requestModels: { 'application/json': postModel },
      requestValidator: postValidator
    };
    const postIntegrationOpt: IntegrationOptions = {
      credentialsRole: gatewayRole,
      requestTemplates: {
        'application/json': `{
          "input": "$util.escapeJavaScript($input.body)",
          "stateMachineArn": "${stateMachine.stateMachineArn}"
        }`
      },
      integrationResponses: [
        {
          statusCode: '200',
          responseTemplates: {
            //'application/json': "$input.path('$.output')"
            'application/json': "{\"pk\": $input.path('$.output')}"
          }
        }
      ]
    }
    const postIntegration = new AwsIntegration({
      service: 'states',
      action: 'StartSyncExecution',
      integrationHttpMethod: 'POST',
      options: postIntegrationOpt
    });
    const data = rest.root.addResource('data');
    data.addMethod('POST', postIntegration, methodOpt);
  }
}