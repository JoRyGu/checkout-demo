import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from '@aws-sdk/client-dynamodb';
import { SQSRecord } from 'aws-lambda';
import Stripe from 'stripe';

export const parseStripeMessage = (record: SQSRecord) => {
  return JSON.parse(record.body) as Stripe.Event;
};

/**
 * Merges duplicate messages into a single message.
 */
export const mergeDuplicateMessages = (records: SQSRecord[]) => {
  const parsedRecords = records.map(parseStripeMessage);
  const uniqueRecords: Record<string, Stripe.Event> = {};

  parsedRecords.forEach((record) => {
    if (record.request?.idempotency_key) {
      uniqueRecords[record.request.idempotency_key] = record;
    }
  });

  const mergedRecords = Object.values(uniqueRecords);

  if (mergedRecords.length !== records.length) {
    console.warn({
      msg: 'Duplicate messages may have been found. Some records may have been dropped due to missing idempotency key.',
      records,
    });
  }

  return mergedRecords;
};

/**
 * Verifies that the event is idempotent and has not been processed before.
 */
export const verifyIdempotency = async (
  client: DynamoDBClient,
  event: Stripe.Event
) => {
  const response = await client.send(
    new GetItemCommand({
      TableName: 'CheckoutStripeIdempotencyTable',
      Key: {
        idempotencyKey: { S: event.request!.idempotency_key! },
      },
    })
  );

  if (response.Item) {
    console.log({ msg: 'Duplicate event found', event });
  }

  return !response.Item;
};

/**
 * Creates a record in the idempotency table to ensure that the event is not processed again.
 */
export const createIdempotencyRecord = async (
  client: DynamoDBClient,
  key: string
) => {
  await client.send(
    new PutItemCommand({
      TableName: 'CheckoutStripeIdempotencyTable',
      Item: {
        idempotencyKey: { S: key },
      },
    })
  );
};

/**
 * Ensures that all events are idempotent and returns only the events that are idempotent.
 * @returns Idempotent events
 */
export const processIdempotency = async (
  client: DynamoDBClient,
  events: Stripe.Event[]
) => {
  const idempotencyResults = await Promise.all(
    events.map((message) => verifyIdempotency(client, message))
  );

  await Promise.all(
    idempotencyResults.map(async (result, idx) => {
      if (result) {
        await createIdempotencyRecord(
          client,
          events[idx].request!.idempotency_key!
        );
      }
    })
  );

  return events.filter((event, idx) => {
    return idempotencyResults[idx];
  });
};
