import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { S3Client, PutObjectCommand, PutObjectCommandInput, GetObjectCommand, GetObjectCommandInput } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

const serviceName = 'bucket-url';
const logger = new Logger({ serviceName: serviceName, logLevel: 'INFO' });
const tracer = new Tracer({ serviceName: serviceName });
tracer.provider.setLogger(logger);
const client = tracer.captureAWSv3Client(
  new S3Client({ region: process.env.AWS_REGION }),
);

const bucketName = process.env.BUCKET_NAME as string;

export const handler = async(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
  logger.addContext(context);

  const body = JSON.parse(event.body as string);
  const fileContent = JSON.stringify(body.content);

  const inputPutObj: PutObjectCommandInput = {
    Bucket: bucketName,
    Key: body.fileName,
    ContentLength: fileContent.length,
    Body: fileContent,
  };
  const commandPutObj = new PutObjectCommand(inputPutObj);
  await client.send(commandPutObj);

  const putObjStr = 'Successfully uploaded object: ' + inputPutObj.Bucket + '/' + inputPutObj.Key;
  logger.info('PutObjectCommand', putObjStr);

  const inputGetObj: GetObjectCommandInput = {
    Bucket: bucketName,
    Key: body.fileName,
  };
  const commandGetObj = new GetObjectCommand(inputGetObj);
  const url = await getSignedUrl(client, commandGetObj, { expiresIn: 30 });
  return {
    statusCode: 200,
    body: url,
  };
};