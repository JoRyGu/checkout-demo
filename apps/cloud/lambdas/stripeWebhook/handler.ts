import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import {
  SendMessageCommand,
  SQSClient,
  GetQueueUrlCommand,
} from '@aws-sdk/client-sqs';
import Stripe from 'stripe';
import { APIGatewayProxyHandler } from 'aws-lambda';
import { jsonResponse } from '../../lib/jsonResponse';

const getStripeSecret = async (client: SecretsManagerClient) => {
  const command = new GetSecretValueCommand({ SecretId: 'StripeSecret' });
  const result = await client.send(command);
  return result.SecretString;
};

const getStripeWebhookSecret = async (client: SecretsManagerClient) => {
  const command = new GetSecretValueCommand({
    SecretId: 'StripeWebhookSecret',
  });
  const result = await client.send(command);
  return result.SecretString;
};

const publishEventToQueue = async (event: Stripe.Event) => {
  const sqs = new SQSClient({ region: 'us-east-1' });
  const queueUrlOutput = await sqs.send(
    new GetQueueUrlCommand({ QueueName: 'CheckoutStripeMessageQueue' })
  );
  await sqs.send(
    new SendMessageCommand({
      QueueUrl: queueUrlOutput.QueueUrl,
      MessageBody: JSON.stringify(event),
    })
  );
};

export const handler: APIGatewayProxyHandler = async (event) => {
  if (!event.headers['Stripe-Signature']) {
    console.error({ msg: 'Missing Stripe-Signature header' });
    return jsonResponse(400, { message: 'Bad Request' });
  }

  if (!event.body) {
    console.error({ msg: 'Missing event body' });
    return jsonResponse(400, { message: 'Bad Request' });
  }

  const smClient = new SecretsManagerClient({ region: 'us-east-1' });
  const [stripeSecret, stripeWebhookSecret] = await Promise.all([
    getStripeSecret(smClient),
    getStripeWebhookSecret(smClient),
  ]);

  if (!stripeSecret || !stripeWebhookSecret) {
    console.error({ msg: 'Missing Stripe secrets' });
    return jsonResponse(500, { message: 'Internal Server Error' });
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: '2022-11-15' });

  try {
    const stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      event.headers['Stripe-Signature'],
      stripeWebhookSecret
    );

    if (
      stripeEvent.type === 'payment_intent.succeeded' ||
      stripeEvent.type === 'payment_intent.created'
    ) {
      await publishEventToQueue(stripeEvent);
    }

    return jsonResponse(200, { success: true });
  } catch (err) {
    console.error({ msg: 'Error processing webhook request', err });
    return jsonResponse(400, { message: 'Bad Request' });
  }
};
