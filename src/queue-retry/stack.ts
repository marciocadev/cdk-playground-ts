import { Stack, StackProps } from "aws-cdk-lib";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";
import { join } from "path";

export class QueueRetry extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    const dlq = new Queue(this, 'DLQueue', {
      queueName: 'dlq-queue-retry',
    });

    const queue = new Queue(this, 'Queue', {
      queueName: 'queue-retry',
      deadLetterQueue: {
        queue: dlq,
        maxReceiveCount: 5
      }
    });

    const lambda = new NodejsFunction(this, 'Lambda', {
      entry: join(__dirname, 'lambda-fns/index.ts'),
      handler: 'handler',
      functionName: 'queue-retry'
    });
    queue.grantConsumeMessages(lambda);
    lambda.addEventSource(new SqsEventSource(queue));
  }
}