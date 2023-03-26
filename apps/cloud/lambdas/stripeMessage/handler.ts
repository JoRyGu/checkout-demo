import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import { SQSHandler } from 'aws-lambda';
import Stripe from 'stripe';
import {
  getPaymentIntent,
  mergeDuplicateMessages,
  processIdempotency,
} from './utils';

const getStripeSecret = async (client: SecretsManagerClient) => {
  const command = new GetSecretValueCommand({ SecretId: 'StripeSecret' });
  const result = await client.send(command);
  return result.SecretString;
};

export const handler: SQSHandler = async (event) => {
  try {
    const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
    const stripeEvents = mergeDuplicateMessages(event.Records);
    const idempontentEvents = await processIdempotency(
      dynamoClient,
      stripeEvents
    );

    const stripeSecret = await getStripeSecret(
      new SecretsManagerClient({ region: 'us-east-1' })
    );

    if (!stripeSecret) {
      console.error({ msg: 'Missing Stripe secrets' });
      throw new Error('Missing Stripe secrets');
    }

    const stripe = new Stripe(stripeSecret, { apiVersion: '2022-11-15' });

    const paymentIntents = await Promise.all(
      idempontentEvents.map((event) => getPaymentIntent(stripe, event))
    );

    console.log({
      msg: 'Retrieved payment intents',
      paymentIntents: JSON.stringify(paymentIntents, null, 2),
    });

    console.log({
      msg: 'Processed Stripe messages',
      events: idempontentEvents,
    });
  } catch (err) {
    console.error({ msg: 'Error processing Stripe message', error: err });
  }
};
