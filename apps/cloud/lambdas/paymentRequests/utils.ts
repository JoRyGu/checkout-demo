import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';

export const getLast10PaymentRequests = async (client: DynamoDBDocument) => {
  const res = await client.query({
    TableName: 'CheckoutPaymentRequestsTable',
    KeyConditionExpression: 'sellerId = :sellerId',
    ExpressionAttributeValues: { ':sellerId': 'test-seller-1' },
    Limit: 10,
    ScanIndexForward: false,
  });

  return res.Items ?? [];
};
