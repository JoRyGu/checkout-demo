import { APIGatewayProxyHandler } from 'aws-lambda';
import { z } from 'zod';

const redirectRequestSchema = z.object({});

export const handler: APIGatewayProxyHandler = async (event, _context) => {
  console.log(event);

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'hello world',
    }),
  };
};
