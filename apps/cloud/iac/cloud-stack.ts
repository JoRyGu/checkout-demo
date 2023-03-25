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

export class CloudStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    // Secrets
    const stripeSecret = new Secret(this, 'StripeSecret', {
      secretName: 'StripeSecret',
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

    const redirectLambda = new NodejsFunction(this, 'CheckoutRedirectLambda', {
      functionName: 'CheckoutRedirectLambda',
      runtime: Runtime.NODEJS_18_X,
      entry: path.resolve('lambdas/checkoutRedirect/handler.ts'),
      handler: 'handler',
      timeout: Duration.seconds(30),
      bundling: {
        nodeModules: ['zod'],
      },
    });

    stripeSecret.grantRead(redirectLambda);

    const redirectLambdaIntegration = new LambdaIntegration(redirectLambda);
    const redirectApiResource = restApi.root.addResource('api');
    const redirectGatewayResource = redirectApiResource.addResource('checkout');
    const redirectGatewayMethod = redirectGatewayResource.addMethod(
      'POST',
      redirectLambdaIntegration
    );

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
