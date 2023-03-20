# Delayed Confirmation Stripe Checkout Demo

## Project Goals

1. Demonstrate that it is possible to integrate the Stripe Checkout API into a system that requires a seller to manually confirm the transaction (Stripe payment intent)
2. Utilize a serverless microservice architecture that makes use of various AWS resources, including API Gateway, Lambda, API Gateway WebSockets, SNS, and DynamoDB
3. Fully automate CI/CD with GitHub actions and AWS CDK

## Proposed Architecture

![Architecture Diagram](https://git-readme-photos.s3.amazonaws.com/checkout-demo-arch.png)
