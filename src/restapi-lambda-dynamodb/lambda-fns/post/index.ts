import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { DynamoDBClient, PutItemCommand, PutItemCommandInput } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { Context, APIGatewayProxyResult, APIGatewayEvent } from 'aws-lambda';

const serviceName = 'restapi-lambda-dynamodb';
const logger = new Logger({ serviceName: serviceName, logLevel: 'INFO' });
const tracer = new Tracer({ serviceName: serviceName });
tracer.provider.setLogger(logger);
const dynamo = tracer.captureAWSv3Client(
  new DynamoDBClient({ region: process.env.AWS_REGION }),
);

export const handler = async(event:APIGatewayEvent, context:Context): Promise<APIGatewayProxyResult> => {
  logger.addContext(context);

  const { body } = event;
  logger.info(body as string);

  const item = JSON.parse(body as string);

  const input:PutItemCommandInput = {
    TableName: process.env.TABLE_NAME,
    Item: marshall(item),
  };

  try {
    await dynamo.send(new PutItemCommand(input));
  } catch (err) {
    logger.error('erro no dynamodb', err as Error);
  }

  return {
    statusCode: 200,
    body: JSON.stringify(item, undefined, 2),
  };
};