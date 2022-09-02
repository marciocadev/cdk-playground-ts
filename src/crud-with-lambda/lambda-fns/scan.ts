import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { AttributeValue, DynamoDBClient, ScanCommand, ScanCommandInput } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { Context, APIGatewayProxyResult } from 'aws-lambda';

const serviceName = 'crud-with-lambda';
const logger = new Logger({ serviceName: serviceName, logLevel: 'INFO' });
const tracer = new Tracer({ serviceName: serviceName });
tracer.provider.setLogger(logger);
const dynamo = tracer.captureAWSv3Client(
  new DynamoDBClient({ region: process.env.AWS_REGION }),
);

export const handler = async(context: Context): Promise<APIGatewayProxyResult> => {
  logger.addContext(context);

  const input: ScanCommandInput = {
    TableName: process.env.TABLE_NAME,
  };

  try {
    const { Items } = await dynamo.send(new ScanCommand(input));
    const items = Items?.map((item) => {
      return unmarshall(item);
    });

    return {
      statusCode: 200,
      body: JSON.stringify(items, undefined, 2),
    };
  } catch (err) {
    logger.error('erro no dynamodb', err as Error);

    return {
      statusCode: 500,
      body: JSON.stringify(err, undefined, 2),
    };
  }
};