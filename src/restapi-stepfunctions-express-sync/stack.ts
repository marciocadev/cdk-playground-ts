import { Stack, StackProps } from 'aws-cdk-lib';
import { JsonSchema, JsonSchemaType, JsonSchemaVersion, MethodLoggingLevel, MethodOptions, Model, RequestValidator, RestApi, StepFunctionsIntegration } from 'aws-cdk-lib/aws-apigateway';
import { Effect, Policy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Chain, JsonPath, Pass, StateMachine, StateMachineType } from 'aws-cdk-lib/aws-stepfunctions';
import { CallAwsService } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';

export class RestApiStepFunctionsExpressSync extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    const detectLanguage = new CallAwsService(this, 'DetectDominantLanguage', {
      service: 'comprehend',
      action: 'detectDominantLanguage',
      iamResources: ['*'],
      parameters: {
        Text: JsonPath.stringAt('$.body.text'),
      },
      resultPath: '$.result',
      outputPath: '$',
    });
    const translateText = new CallAwsService(this, 'TranslateText', {
      service: 'translate',
      action: 'translateText',
      iamResources: ['*'],
      parameters: {
        Text: JsonPath.stringAt('$.body.text'),
        SourceLanguageCode: JsonPath.stringAt('$.result.Languages[0].LanguageCode'),
        TargetLanguageCode: 'pt',
      },
      resultPath: '$.result',
      outputPath: '$',
    });
    const result = new Pass(this, 'ResultRequest', {
      parameters: {
        'SourceText.$': '$.body.text',
        'SourceLanguage.$': '$.result.SourceLanguageCode',
        'TranslatedText.$': '$.result.TranslatedText',
        'TargetLanguage.$': '$.result.TargetLanguageCode',
      },
    });
    const chain = Chain.start(detectLanguage)
      .next(translateText)
      .next(result);
    const stateMachine = new StateMachine(this, 'StateMachine', {
      stateMachineName: 'restapi-stepfunctions-express-sync',
      definition: chain,
      stateMachineType: StateMachineType.EXPRESS,
    });

    const servicePrincipal = new ServicePrincipal('apigateway.amazonaws.com');
    const gatewayRole = new Role(this, 'GatewayRole', { assumedBy: servicePrincipal });
    gatewayRole.attachInlinePolicy(
      new Policy(this, 'StepFunctionsPolicy', {
        statements: [
          new PolicyStatement({
            actions: ['states:StartSyncExecution'],
            effect: Effect.ALLOW,
            resources: [stateMachine.stateMachineArn],
          }),
        ],
      }),
    );
    const rest = new RestApi(this, 'RestApi', {
      restApiName: 'restapi-stepfunctions-express-sync',
      deployOptions: {
        loggingLevel: MethodLoggingLevel.INFO,
      },
    });
    const postSchema: JsonSchema = {
      title: 'PostSchema',
      type: JsonSchemaType.OBJECT,
      schema: JsonSchemaVersion.DRAFT4,
      required: ['text'],
      properties: {
        text: { type: JsonSchemaType.STRING },
      },
    };
    const postModel = new Model(this, 'PostModel', {
      restApi: rest,
      contentType: 'application/json',
      schema: postSchema,
    });
    const postValidator = new RequestValidator(this, 'RequestValidator', {
      requestValidatorName: 'validator',
      restApi: rest,
      validateRequestBody: true,
      validateRequestParameters: false,
    });
    const methodOpt: MethodOptions = {
      methodResponses: [{ statusCode: '200' }],
      requestModels: { 'application/json': postModel },
      requestValidator: postValidator,
    };
    const data = rest.root.addResource('translate');
    data.addMethod('POST', StepFunctionsIntegration.startExecution(stateMachine), methodOpt);
  }
}