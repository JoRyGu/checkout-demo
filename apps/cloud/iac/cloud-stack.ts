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

export class CloudStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

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

    const redirectLambdaIntegration = new LambdaIntegration(redirectLambda);
    const redirectApiResource = restApi.root.addResource('api');
    const redirectGatewayResource = redirectApiResource.addResource('checkout');
    const redirectGatewayMethod = redirectGatewayResource.addMethod(
      'POST',
      redirectLambdaIntegration
    );

    const clientBucket = new Bucket(this, 'CheckoutDemoClientBucket', {
      bucketName: 'checkout-demo-client-bucket',
      accessControl: BucketAccessControl.PRIVATE,
    });

    new BucketDeployment(this, 'CheckoutDemoClientBucketDeployment', {
      destinationBucket: clientBucket,
      sources: [Source.asset(path.resolve('../client/dist'))],
    });
  }
}
