import * as path from 'node:path';
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

type CheckoutRestApiIntegrations = {
  checkoutRedirect: NodejsFunction;
  stripeWebhook: NodejsFunction;
  paymentRequests: NodejsFunction;
};

export class CheckoutRestApi {
  private lambdas: CheckoutRestApiIntegrations;

  constructor(scope: Construct) {
    const restApi = new RestApi(scope, 'CheckoutDemoRestApi', {
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

    const redirectLambda = new NodejsFunction(scope, 'CheckoutRedirectLambda', {
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
      scope,
      'CheckoutStripeWebhookLambda',
      {
        functionName: 'CheckoutStripeWebhookLambda',
        runtime: Runtime.NODEJS_18_X,
        entry: path.resolve('lambdas/stripeWebhook/handler.ts'),
        handler: 'handler',
        timeout: Duration.seconds(30),
        bundling: {
          nodeModules: [
            'stripe',
            '@aws-sdk/client-secrets-manager',
            '@aws-sdk/client-sqs',
          ],
        },
      }
    );

    const redirectLambdaIntegration = new LambdaIntegration(redirectLambda);
    const redirectGatewayResource = apiResource.addResource('checkout');
    redirectGatewayResource.addMethod('POST', redirectLambdaIntegration);

    const stripeWebhookLambdaIntegration = new LambdaIntegration(
      stripeWebhookLambda
    );
    const stripeWebhookApiResource = apiResource.addResource('stripehook');
    stripeWebhookApiResource.addMethod('POST', stripeWebhookLambdaIntegration);

    const paymentRequestsLambda = new NodejsFunction(
      scope,
      'CheckoutPaymentRequests',
      {
        functionName: 'CheckoutPaymentRequests',
        runtime: Runtime.NODEJS_18_X,
        entry: path.resolve('lambdas/paymentRequests/handler.ts'),
        handler: 'handler',
        timeout: Duration.seconds(30),
        bundling: {
          nodeModules: ['@aws-sdk/client-dynamodb', '@aws-sdk/lib-dynamodb'],
        },
      }
    );
    const paymentRequestsIntegration = new LambdaIntegration(
      paymentRequestsLambda
    );
    const paymentRequestsApiResource =
      apiResource.addResource('payment-requests');
    paymentRequestsApiResource.addMethod('GET', paymentRequestsIntegration);
    paymentRequestsApiResource.addMethod('PUT', paymentRequestsIntegration);

    this.lambdas = {
      checkoutRedirect: redirectLambda,
      stripeWebhook: stripeWebhookLambda,
      paymentRequests: paymentRequestsLambda,
    };
  }

  public grantPermission(
    lambda: keyof CheckoutRestApiIntegrations,
    permissionFunc: (lambda: NodejsFunction) => void
  ) {
    permissionFunc(this.lambdas[lambda]);
  }
}
