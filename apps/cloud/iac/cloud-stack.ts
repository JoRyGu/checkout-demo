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
import { Bucket, BucketAccessControl } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { SqsDestination } from 'aws-cdk-lib/aws-lambda-destinations';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';

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

    const stripeWebhookLambda = new NodejsFunction(
      this,
      'CheckoutStripeWebhookLambda',
      {
        functionName: 'CheckoutStripeWebhookLambda',
        runtime: Runtime.NODEJS_18_X,
        entry: path.resolve('lambdas/stripeWebhook/handler.ts'),
        handler: 'handler',
        timeout: Duration.seconds(30),
        bundling: {
          nodeModules: ['stripe', '@aws-sdk/client-secrets-manager'],
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

    // SQS
    const stripeMessageQueue = new Queue(this, 'StripeMessageQueue', {
      queueName: 'StripeMessageQueue',
    });
    const stripeMessageDlq = new Queue(this, 'StripeMessageDlq', {
      queueName: 'StripeMessageDlq',
    });

    // SQS Lambdas
    const stripeMessageLambda = new NodejsFunction(
      this,
      'StripeMessageLambda',
      {
        functionName: 'StripeMessageLambda',
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
