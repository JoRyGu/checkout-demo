import { APIGatewayProxyEvent } from 'aws-lambda';
import { jsonResponse } from './jsonResponse';

export const checkHeaders = (event: APIGatewayProxyEvent) => {
  const value =
    event.headers[
      Object.keys(event.headers).find(
        (key) => key.toLowerCase() === 'content-type'
      ) ?? ''
    ];
  if (!value) {
    return jsonResponse(415, { message: 'Unsupported Media Type' });
  }

  if (value !== 'application/x-www-form-urlencoded') {
    return jsonResponse(415, { message: 'Unsupported Media Type' });
  }

  return null;
};
