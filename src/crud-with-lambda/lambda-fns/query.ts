import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { DynamoDBClient, GetItemCommand, GetItemCommandInput } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Context, APIGatewayProxyResult, APIGatewayEvent } from 'aws-lambda';

const serviceName = 'restapi-lambda-dynamodb';
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

  const account: number = parseInt(pathParameters?.account as string);
  const transactId: string = queryStringParameters?.transactId as string;

  const key = { [pk]: account, [sk]: transactId };
  logger.info('key', { object: key });
  const marshallKey = marshall(key);
  logger.info('marshallKey', { object: marshallKey });

  const input: GetItemCommandInput = {
    TableName: process.env.TABLE_NAME,
    Key: marshallKey,
  };
  try {
    const data = await dynamo.send(new GetItemCommand(input));
    const item = unmarshall(data.Item as {});

    logger.info('item', { object: item });

    return {
      statusCode: 200,
      body: JSON.stringify(item, undefined, 2),
    };
  } catch (err) {
    logger.error('erro no dynamodb', err as Error);

    return {
      statusCode: 500,
      body: JSON.stringify(err, undefined, 2),
    };
  }
};