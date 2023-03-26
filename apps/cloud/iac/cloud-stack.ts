import * as path from 'node:path';
import * as cdk from 'aws-cdk-lib';
import {
  Cors,
  EndpointType,
  LambdaIntegration,
  RestApi,
} from 'aws-cdk-lib/aws-apigateway';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { SqsDestination } from 'aws-cdk-lib/aws-lambda-destinations';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import {
  Effect,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';

export class CloudStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    // Secrets
    const stripeSecret = new Secret(this, 'StripeSecret', {
      secretName: 'StripeSecret',
    });
    const stripeWebhookSecret = new Secret(this, 'StripeWebhookSecret', {
      secretName: 'StripeWebhookSecret',
    });

    // SQS
    const stripeMessageQueue = new Queue(this, 'CheckoutStripeMessageQueue', {
      queueName: 'CheckoutStripeMessageQueue',
    });
    const stripeMessageDlq = new Queue(this, 'CheckoutStripeMessageDlq', {
      queueName: 'CheckoutStripeMessageDlq',
    });

    // API Gateway
    const restApi = new RestApi(this, 'CheckoutDemoRestApi', {
      restApiName: 'CheckoutDemo',
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
        allowHeaders: Cors.DEFAULT_HEADERS,
      },
      endpointConfiguration: {
        types: [EndpointType.REGIONAL],
      },
    });
    const apiResource = restApi.root.addResource('api');

    // API Gateway Lambdas
    const redirectLambda = new NodejsFunction(this, 'CheckoutRedirectLambda', {
      functionName: 'CheckoutRedirectLambda',
      runtime: Runtime.NODEJS_18_X,
      entry: path.resolve('lambdas/checkoutRedirect/handler.ts'),
      handler: 'handler',
      timeout: Duration.seconds(30),
      bundling: {
        nodeModules: ['zod', 'stripe', '@aws-sdk/client-secrets-manager'],
      },
    });

    const stripeMessageLambdaRole = new Role(
      this,
      'CheckoutStripeMessageLambdaRole',
      {
        assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      }
    );
    const stripeMessageLambdaPolicy = new PolicyStatement({
      actions: ['sqs:SendMessage'],
      effect: Effect.ALLOW,
      resources: [stripeMessageQueue.queueArn],
    });
    stripeMessageLambdaPolicy.addCondition('ArnEquals', {
      'aws:SourceArn': stripeMessageQueue.queueArn,
    });
    stripeMessageLambdaRole.addToPolicy(stripeMessageLambdaPolicy);

    const stripeWebhookLambda = new NodejsFunction(
      this,
      'CheckoutStripeWebhookLambda',
      {
        functionName: 'CheckoutStripeWebhookLambda',
        runtime: Runtime.NODEJS_18_X,
        entry: path.resolve('lambdas/stripeWebhook/handler.ts'),
        handler: 'handler',
        timeout: Duration.seconds(30),
        role: stripeMessageLambdaRole,
        bundling: {
          nodeModules: [
            'stripe',
            '@aws-sdk/client-secrets-manager',
            '@aws-sdk/client-sqs',
          ],
        },
      }
    );

    stripeSecret.grantRead(redirectLambda);
    stripeSecret.grantRead(stripeWebhookLambda);
    stripeWebhookSecret.grantRead(stripeWebhookLambda);

    const redirectLambdaIntegration = new LambdaIntegration(redirectLambda);
    const redirectGatewayResource = apiResource.addResource('checkout');
    redirectGatewayResource.addMethod('POST', redirectLambdaIntegration);

    const stripeWebhookLambdaIntegration = new LambdaIntegration(
      stripeWebhookLambda
    );
    const stripeWebhookApiResource = apiResource.addResource('stripehook');
    stripeWebhookApiResource.addMethod('POST', stripeWebhookLambdaIntegration);

    // SQS Lambdas
    const stripeMessageLambda = new NodejsFunction(
      this,
      'CheckoutStripeMessageLambda',
      {
        functionName: 'CheckoutStripeMessageLambda',
        runtime: Runtime.NODEJS_18_X,
        entry: path.resolve('lambdas/stripeMessage/handler.ts'),
        handler: 'handler',
        timeout: Duration.seconds(30),
        onFailure: new SqsDestination(stripeMessageDlq),
      }
    );

    stripeMessageLambda.addEventSource(new SqsEventSource(stripeMessageQueue));
    stripeSecret.grantRead(stripeMessageLambda);

    // Buckets
    const clientBucket = new Bucket(this, 'CheckoutDemoClientBucket', {
      bucketName: 'checkout-demo-client-bucket',
      publicReadAccess: true,
      websiteIndexDocument: 'index.html',
    });

    new BucketDeployment(this, 'CheckoutDemoClientBucketDeployment', {
      destinationBucket: clientBucket,
      sources: [Source.asset(path.resolve('../client/dist'))],
    });

    const adminBucket = new Bucket(this, 'CheckoutDemoAdminBucket', {
      bucketName: 'checkout-demo-admin-bucket',
      publicReadAccess: true,
      websiteIndexDocument: 'index.html',
    });

    new BucketDeployment(this, 'CheckoutDemoAdminBucketDeployment', {
      destinationBucket: adminBucket,
      sources: [Source.asset(path.resolve('../admin-client/dist'))],
    });
  }
}
