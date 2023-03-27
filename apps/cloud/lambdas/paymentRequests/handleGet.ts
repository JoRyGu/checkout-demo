import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { jsonResponse } from '../../lib/jsonResponse';
import { getLast10PaymentRequests } from './utils';

type GetPaymentReqeustsQueryParams = {
  filter: 'paid';
};

export const handleGet = async (event: APIGatewayProxyEvent) => {
  const queryParams =
    event.queryStringParameters as GetPaymentReqeustsQueryParams | null;

  const client = new DynamoDBClient({ region: 'us-east-1' });
  const documentClient = DynamoDBDocument.from(client);

  if (!queryParams) {
    const result = await getLast10PaymentRequests(documentClient);
    return jsonResponse(200, result);
  }

  return jsonResponse(200, { message: 'OK' });
};
