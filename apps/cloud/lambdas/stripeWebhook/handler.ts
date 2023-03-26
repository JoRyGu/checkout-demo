import { APIGatewayProxyHandler } from 'aws-lambda';
import { jsonResponse } from '../../lib/jsonResponse';

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log(event);

  return jsonResponse(200, { success: true });
};
