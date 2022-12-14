import { join } from 'path';
import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { AttributeType, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Tracing } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Chain, JsonPath, Map, Parallel, Pass, StateMachine, StateMachineType, TaskInput } from 'aws-cdk-lib/aws-stepfunctions';
import { DynamoAttributeValue, DynamoGetItem, DynamoPutItem, DynamoUpdateItem, LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';

export class StepFunctionsStandardDynamoDB extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    const table = new Table(this, 'Table', {
      tableName: 'restapi-stepfunctions-standard',
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
      tracing: Tracing.ACTIVE,
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
      tracing: Tracing.ACTIVE,
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
    });
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
          strMap: DynamoAttributeValue.fromString(JsonPath.stringAt('$.map.strMap')),
          numMap: DynamoAttributeValue.numberFromString(JsonPath.stringAt('States.JsonToString($.map.numMap)')),
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

    new StateMachine(this, 'StateMachine', {
      stateMachineName: 'restapi-stepfunctions-standard',
      definition: chain,
      stateMachineType: StateMachineType.STANDARD,
      tracingEnabled: true,
    });
  }
}