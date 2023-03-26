import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { CheckoutRestApi } from './CheckoutRestApi';
import { CheckoutStripeMessageQueue } from './CheckoutStripeMessageQueue';
import { CheckoutFrontEndDeployment } from './CheckoutFrontEndDeployment';
import { AttributeType, Table } from 'aws-cdk-lib/aws-dynamodb';

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

    // Dynamo Tables
    const stripeIdempotencyTable = new Table(
      this,
      'CheckoutStripeIdempotencyTable',
      {
        tableName: 'CheckoutStripeIdempotencyTable',
        partitionKey: { name: 'idempotencyKey', type: AttributeType.STRING },
      }
    );

    // SQS
    const stripeMessageQueue = new CheckoutStripeMessageQueue(this);
    stripeMessageQueue.grantLambdaPermission((lambda) =>
      stripeSecret.grantRead(lambda)
    );
    stripeMessageQueue.grantLambdaPermission((lambda) =>
      stripeIdempotencyTable.grantReadWriteData(lambda)
    );

    // Api Gateway
    const restApi = new CheckoutRestApi(this);
    restApi.grantPermission('checkoutRedirect', (lambda) =>
      stripeSecret.grantRead(lambda)
    );
    restApi.grantPermission('stripeWebhook', (lambda) =>
      stripeSecret.grantRead(lambda)
    );
    restApi.grantPermission('stripeWebhook', (lambda) =>
      stripeWebhookSecret.grantRead(lambda)
    );
    restApi.grantPermission('stripeWebhook', (lambda) =>
      stripeMessageQueue.queue.grantSendMessages(lambda)
    );

    // Buckets
    new CheckoutFrontEndDeployment(this);
  }
}
