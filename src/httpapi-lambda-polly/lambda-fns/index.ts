import { Stream } from 'stream';
import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { Engine, OutputFormat, PollyClient, SynthesizeSpeechCommand, SynthesizeSpeechInput, TextType } from '@aws-sdk/client-polly';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

const serviceName = 'httpapi-lambda-polly';
const logger = new Logger({ serviceName: serviceName, logLevel: 'INFO' });
const tracer = new Tracer({ serviceName: serviceName });
tracer.provider.setLogger(logger);

const pollyClient = tracer.captureAWSv3Client(new PollyClient({ region: process.env.AWS_REGION }));

export const handler = async(event:APIGatewayProxyEventV2) => {

  if (!event?.body || !event?.pathParameters) {
    throw new Error('text or voice not found');
  }

  let { voice } = event.pathParameters;
  let text = event.body;

  logger.info('Texto', text);

  const input:SynthesizeSpeechInput = {
    Text: text,
    VoiceId: voice,
    Engine: Engine.NEURAL,
    TextType: TextType.TEXT,
    OutputFormat: OutputFormat.MP3, //.JSON,
    // SpeechMarkTypes: ["sentence"]
  };
  const command = new SynthesizeSpeechCommand(input);

  let synth;
  try {
    synth = await pollyClient.send(command);
  } catch (err:any) {
    logger.error('Erro', err);
    throw err;
  }

  logger.info('synthesize speech success');
  const buffer = await stream2buffer(synth.AudioStream);

  const result:APIGatewayProxyResultV2 = {
    statusCode: 200,
    body: buffer.toString('base64'),
    isBase64Encoded: true,
    headers: {
      'Content-Type': 'audio/mpeg',
    },
  };

  return result;
};

async function stream2buffer(stream:Stream): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const _buf = Array<any>();
    stream.on('data', chunk => _buf.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(_buf)));
    stream.on('error', err => reject(`error converting stream - ${err}`));
  });
}