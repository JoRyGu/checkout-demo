import { APIGatewayProxyHandler } from 'aws-lambda';
import { jsonResponse } from '../../lib/jsonResponse';
import { handleGet } from './handleGet';

export const handler: APIGatewayProxyHandler = async (event) => {
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'PUT') {
    return jsonResponse(405, { message: 'Method Not Allowed' });
  }

  if (event.httpMethod === 'GET') {
    return handleGet(event);
  } else {
    return jsonResponse(500, { message: 'Not Implemented Yet' });
  }
};
