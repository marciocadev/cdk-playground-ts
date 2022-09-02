import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { Context, DynamoDBStreamEvent } from 'aws-lambda';
import { DynamoDBClient, UpdateItemCommand, UpdateItemCommandInput} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const serviceName = 'restapi-lambda-dynamodb';
const logger = new Logger({ serviceName: serviceName, logLevel: 'INFO' });
const tracer = new Tracer({ serviceName: serviceName });
tracer.provider.setLogger(logger);
const dynamo = tracer.captureAWSv3Client(
  new DynamoDBClient({ region: process.env.AWS_REGION }),
);

const sk = process.env.SORT_KEY as string;
const pk = process.env.PARTITION_KEY as string;

export const handler = async(event: DynamoDBStreamEvent, context: Context) => {
  logger.addContext(context);

  logger.info('event', event);

  let { Records } = event;
  for (let record of Records) {
    let keys = unmarshall(record.dynamodb?.Keys);
    logger.info('record.dynamodb', {object: record.dynamodb});
    logger.info('keys', {object: keys});
    logger.info('pk', {object: keys.pk});
    let newItem = unmarshall(record.dynamodb?.NewImage);
    logger.info('newItem', {object: newItem});
    let input: UpdateItemCommandInput = {
      TableName: process.env.TABLE_NAME,
      Key: marshall({pk: keys.pk, sk: 'SUM'}),
      UpdateExpression: 'ADD #amount :inc',
      ExpressionAttributeNames: {'#amount': 'amount'},
      ExpressionAttributeValues: marshall({':inc': newItem.amount})
    }
    logger.info('input', {object: input});
    // await dynamo.send(new UpdateItemCommand(input));
  }
  
};