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
  }
}
