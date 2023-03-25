import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import { APIGatewayProxyHandler } from 'aws-lambda';
import { z } from 'zod';

const redirectRequestSchema = z.object({});

const getStripeSecret = async () => {
  const client = new SecretsManagerClient({ region: 'us-east-1' });
  const command = new GetSecretValueCommand({ SecretId: 'StripeSecret' });
  return client.send(command);
};

export const handler: APIGatewayProxyHandler = async (event, _context) => {
  const stripeKey = await getStripeSecret();
  console.log({ stripeKey });

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'hello world',
    }),
  };
};
