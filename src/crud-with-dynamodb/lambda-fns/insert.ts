import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { Context, DynamoDBStreamEvent } from 'aws-lambda';

const serviceName = 'restapi-lambda-dynamodb';
const logger = new Logger({ serviceName: serviceName, logLevel: 'INFO' });
const tracer = new Tracer({ serviceName: serviceName });
tracer.provider.setLogger(logger);

const sk = process.env.SORT_KEY as string;
const pk = process.env.PARTITION_KEY as string;

export const handler = async(event: DynamoDBStreamEvent, context: Context) => {
  logger.addContext(context);

  logger.info('event', { object: event });
};