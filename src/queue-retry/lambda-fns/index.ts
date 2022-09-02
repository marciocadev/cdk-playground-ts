import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { Context, SQSEvent } from 'aws-lambda';

const serviceName = 'queue-retry';
const logger = new Logger({ serviceName: serviceName, logLevel: 'INFO' });
const tracer = new Tracer({ serviceName: serviceName });
tracer.provider.setLogger(logger);

export const handler = async(event: SQSEvent, context: Context) => {
  logger.addContext(context);
  logger.info('event', event);
  if (event.Records[0].attributes.ApproximateReceiveCount === '4') {
    logger.info('4 retries');
    return 'ok';
  }
  logger.error('retry number: ' + event.Records[0].attributes.ApproximateReceiveCount);
  throw new Error('erro');
}