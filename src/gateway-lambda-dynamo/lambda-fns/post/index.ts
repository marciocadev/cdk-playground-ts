import { Logger } from '@aws-lambda-powertools/logger';
import { Context, APIGatewayProxyResult, APIGatewayEvent } from 'aws-lambda';
import { marshall } from '@aws-sdk/util-dynamodb';
import { DynamoDBClient, PutItemCommand, PutItemCommandInput } from '@aws-sdk/client-dynamodb';

const logger = new Logger({ serviceName: 'gateway-lambda-dynamodb', logLevel: 'INFO' });
const dynamo = new DynamoDBClient({ region: process.env.AWS_REGION });

export const handler = async(event:APIGatewayEvent , context:Context): Promise<APIGatewayProxyResult> => {
  logger.addContext(context);
  
  const { body } = event;
  logger.info(body as string);

  const item = JSON.parse(body as string);

  const input:PutItemCommandInput = {
    TableName: process.env.TABLE_NAME,
    Item: marshall(item),
  }

  try {
    await dynamo.send(new PutItemCommand(input));
  } catch(err) {
    logger.error('erro no dynamodb', err as Error);
  }

  return {
    statusCode: 200,
    body: JSON.stringify(item, undefined, 2)
  }
}