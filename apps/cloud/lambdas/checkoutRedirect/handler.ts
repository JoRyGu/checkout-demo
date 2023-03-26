import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import { APIGatewayProxyHandler } from 'aws-lambda';
import Stripe from 'stripe';
import { z } from 'zod';
import { checkHeaders } from '../../lib/checkHeaders';
import { jsonResponse } from '../../lib/jsonResponse';

const redirectRequestSchema = z.object({
  name: z
    .string({ required_error: 'name is a required field' })
    .min(1, 'name is a required field'),
  description: z
    .string({ required_error: 'description is a required field' })
    .min(1, 'description is a required field'),
  images: z.string().min(0).optional(),
  price: z.coerce
    .number({
      required_error: 'price is a required field',
      invalid_type_error: 'invalid price',
    })
    .min(0, 'price cannot be negative'),
  currency: z.enum(['USD', 'CAD', 'EUR', 'GBP'], {
    required_error: 'currency is a required field',
    invalid_type_error: 'invalid currency',
  }),
  quantity: z.coerce
    .number({
      required_error: 'quantity is a required field',
      invalid_type_error: 'invalid quantity',
    })
    .min(0, 'quantity cannot be negative'),
  maxQuantity: z.coerce
    .number({
      required_error: 'maxQuantity is a required field',
      invalid_type_error: 'invalid maxQuantity',
    })
    .min(1, 'maxQuantity cannot be lower than 1'),
});

const getStripeSecret = async () => {
  const client = new SecretsManagerClient({ region: 'us-east-1' });
  const command = new GetSecretValueCommand({ SecretId: 'StripeSecret' });
  const result = await client.send(command);
  return result.SecretString;
};

export const handler: APIGatewayProxyHandler = async (event, _context) => {
  const headersError = checkHeaders(event);
  if (headersError) {
    return headersError;
  }

  if (!event.body) {
    console.error({ msg: 'Missing event body' });
    return jsonResponse(400, { message: 'Bad Request' });
  }

  const body = Object.fromEntries(new URLSearchParams(event.body).entries());

  const validationResult = redirectRequestSchema.safeParse(body);
  if (!validationResult.success) {
    console.error({ msg: 'Invalid request', validation: validationResult });
    return jsonResponse(400, validationResult.error.flatten());
  }

  const { data } = validationResult;

  let images: string[] | null = null;
  if (data.images) {
    images = data.images.split(',');
  }

  const stripeKey = await getStripeSecret();

  if (!stripeKey) {
    console.error({ msg: 'Stripe key not found' });
    return jsonResponse(500, { message: 'Internal Server Error' });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2022-11-15' });

  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price_data: {
          currency: data.currency,
          product_data: {
            name: data.name,
            description: data.description,
            images: images ?? undefined,
          },
          unit_amount: data.price,
        },
        quantity: data.quantity,
        adjustable_quantity: {
          enabled: true,
          maximum: data.maxQuantity,
        },
      },
    ],
    mode: 'payment',
    success_url: 'https://checkout-demo.jgude.dev/success',
  });

  return jsonResponse(303, null, { Location: session.url! });
};
