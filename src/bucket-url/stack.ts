import { join } from 'path';
import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export class BucketURL extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    const bucket = new Bucket(this, 'Bucket', {
      autoDeleteObjects: true,
      bucketName: 'mca-bucket-signed-url',
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const lambda = new NodejsFunction(this, 'Lambda', {
      functionName: 'bucket-url',
      entry: join(__dirname, 'lambda-fns/index.ts'),
      handler: 'handler',
      environment: {
        BUCKET_NAME: bucket.bucketName,
      },
    });
    bucket.grantReadWrite(lambda);

    const rest = new RestApi(this, 'RestApi', {
      restApiName: 'bucket-url',
    });
    const fileResource = rest.root.addResource('file');
    fileResource.addMethod('POST', new LambdaIntegration(lambda));
  }
}