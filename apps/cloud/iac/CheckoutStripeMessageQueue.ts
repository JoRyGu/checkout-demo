import * as path from 'node:path';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';
import { SqsDestination } from 'aws-cdk-lib/aws-lambda-destinations';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';

export class CheckoutStripeMessageQueue {
  public queue: Queue;
  private lambda: NodejsFunction;

  constructor(scope: Construct) {
    const stripeMessageQueue = new Queue(scope, 'CheckoutStripeMessageQueue', {
      queueName: 'CheckoutStripeMessageQueue',
    });
    const stripeMessageDlq = new Queue(scope, 'CheckoutStripeMessageDlq', {
      queueName: 'CheckoutStripeMessageDlq',
    });

    this.queue = stripeMessageQueue;

    const stripeMessageLambda = new NodejsFunction(
      scope,
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

    this.lambda = stripeMessageLambda;

    stripeMessageLambda.addEventSource(new SqsEventSource(stripeMessageQueue));
  }

  public grantLambdaPermission(
    permissionFunc: (lambda: NodejsFunction) => void
  ) {
    permissionFunc(this.lambda);
  }
}
