import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { SecretsManagerClient, GetSecretValueCommand, GetSecretValueCommandInput, GetSecretValueCommandOutput } from '@aws-sdk/client-secrets-manager';
import { Context } from 'aws-lambda';

const serviceName = 'secret-manager-caching';
const logger = new Logger({ serviceName: serviceName, logLevel: 'INFO' });
const tracer = new Tracer({ serviceName: serviceName });
tracer.provider.setLogger(logger);
const client = tracer.captureAWSv3Client(
  new SecretsManagerClient({ region: process.env.AWS_REGION }),
);

const secretArn = process.env.SECRET as string;

let secret: any | undefined;

const getSecret = async() => {
  let origin: string;
  if (secret === undefined) {
    origin = 'Get secret from Secret Manager';
    const input: GetSecretValueCommandInput = {
      SecretId: secretArn,
    };
    const command = new GetSecretValueCommand(input);
    secret = await client.send(command);
  } else {
    origin = 'Get secret from cache';
  }
  logger.info(origin, { object: JSON.parse(secret.SecretString as string) });
  return secret;
};

export const handler = async(event: any, context: Context) => {
  logger.addContext(context);

  await getSecret();

  return {
    statusCode: 200,
  };
};