import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';

const serviceName = 'stepfunctions-standard-dynamodb';
const logger = new Logger({ serviceName: serviceName, logLevel: 'INFO' });
const tracer = new Tracer({ serviceName: serviceName });
tracer.provider.setLogger(logger);

export const handler = async(event:any) => {
  logger.info('event', event);
  return {
    M: {
      num: { N: (event.input.num).toString() },
      str: { S: event.input.str },
    },
  };
};