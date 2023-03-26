import * as path from 'node:path';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';

export class CheckoutFrontEndDeployment {
  constructor(scope: Construct) {
    const clientBucket = new Bucket(scope, 'CheckoutDemoClientBucket', {
      bucketName: 'checkout-demo-client-bucket',
      publicReadAccess: true,
      websiteIndexDocument: 'index.html',
    });

    new BucketDeployment(scope, 'CheckoutDemoClientBucketDeployment', {
      destinationBucket: clientBucket,
      sources: [Source.asset(path.resolve('../client/dist'))],
    });

    const adminBucket = new Bucket(scope, 'CheckoutDemoAdminBucket', {
      bucketName: 'checkout-demo-admin-bucket',
      publicReadAccess: true,
      websiteIndexDocument: 'index.html',
    });

    new BucketDeployment(scope, 'CheckoutDemoAdminBucketDeployment', {
      destinationBucket: adminBucket,
      sources: [Source.asset(path.resolve('../admin-client/dist'))],
    });
  }
}
