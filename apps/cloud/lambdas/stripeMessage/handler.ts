import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SQSHandler } from 'aws-lambda';
import { mergeDuplicateMessages, processIdempotency } from './utils';

export const handler: SQSHandler = async (event) => {
  try {
    const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
    const stripeEvents = mergeDuplicateMessages(event.Records);
    const idempontentEvents = await processIdempotency(
      dynamoClient,
      stripeEvents
    );

    console.log({
      msg: 'Processed Stripe messages',
      events: idempontentEvents,
    });
  } catch (err) {
    console.error({ msg: 'Error processing Stripe message', error: err });
  }
};
