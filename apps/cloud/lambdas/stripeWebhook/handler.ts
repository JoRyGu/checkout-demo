import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
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

    switch (stripeEvent.type) {
      case 'payment_intent.created':
        console.log(stripeEvent.data.object);
        break;
      case 'payment_intent.succeeded':
        console.log(stripeEvent.data.object);
        break;
    }

    return jsonResponse(200, { success: true });
  } catch (err) {
    console.error({ msg: 'Error verifying webhook signature', err });
    return jsonResponse(400, { message: 'Bad Request' });
  }
};
