import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { DynamoDBClient, UpdateItemCommand, UpdateItemCommandInput } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { Context, APIGatewayProxyResult, APIGatewayEvent } from 'aws-lambda';

const serviceName = 'crud-with-lambda';
const logger = new Logger({ serviceName: serviceName, logLevel: 'INFO' });
const tracer = new Tracer({ serviceName: serviceName });
tracer.provider.setLogger(logger);
const dynamo = tracer.captureAWSv3Client(
  new DynamoDBClient({ region: process.env.AWS_REGION }),
);

const pk = process.env.PARTITION_KEY as string;
const sk = process.env.SORT_KEY as string;

export const handler = async(event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> => {
  logger.addContext(context);

  const { pathParameters, queryStringParameters } = event;
  logger.info('pathParameters', pathParameters as {});
  logger.info('queryStringParameters', queryStringParameters as {});

  const { body } = event;
  logger.info('body', body as string);

  const account: string = 'ACCOUNT#' + parseInt(pathParameters?.account as string);
  const transaction: string = 'TRANSACTION#' + queryStringParameters?.transaction as string;

  const item = JSON.parse(body as string);
  const itemKey = Object.keys(item);
  if (!item || itemKey.length < 1) {
    return { statusCode: 400, body: 'invalid request, no arguments provided' };
  }

  const key = { [pk]: account, [sk]: transaction };
  logger.info('key', { object: key });
  const marshallKey = marshall(key);

  const updateExpression = itemKey.map((itemUp) => { return `#${itemUp} = :${itemUp}`; }).toString();
  let expressionAttributeValues: {[key:string]: any} = {};
  itemKey.forEach((id: string) => {
    expressionAttributeValues[`:${id}`] = item[id];
  });
  const expAttrValues = marshall(expressionAttributeValues);

  let expAttrNames: {[key:string]: any} = {};
  itemKey.forEach((id: string) => {
    expAttrNames[`#${id}`] = id;
  });

  logger.info('updateItem', {
    object: {
      Key: marshallKey,
      UpdateExpression: `set ${updateExpression}`,
      ExpressionAttributeValues: expAttrValues,
      ExpressionAttributeNames: expAttrNames,
    },
  });

  const input: UpdateItemCommandInput = {
    TableName: process.env.TABLE_NAME,
    Key: marshallKey,
    UpdateExpression: `set ${updateExpression}`,
    ExpressionAttributeValues: expAttrValues,
    ExpressionAttributeNames: expAttrNames,
    ReturnValues: 'UPDATED_NEW',
  };
  try {
    await dynamo.send(new UpdateItemCommand(input));
    return {
      statusCode: 200,
      body: 'item updated',
    };
  } catch (err) {
    logger.error('erro no dynamodb', err as Error);

    return {
      statusCode: 500,
      body: JSON.stringify(err, undefined, 2),
    };
  }
};