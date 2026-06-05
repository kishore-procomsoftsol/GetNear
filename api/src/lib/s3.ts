import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const REGION = process.env.AWS_REGION || 'ap-south-1';
const BUCKET = process.env.S3_BUCKET || 'getnear-assets';

const s3Client = new S3Client({
  region: REGION,
  // Uses IAM role credentials from the ECS task execution role automatically
  // For local dev, uses AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY env vars
});

/**
 * Upload a file buffer to S3.
 * Returns the public URL.
 */
export async function uploadToS3(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  // Return the public S3 URL
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}

/**
 * Delete a file from S3 by key.
 */
export async function deleteFromS3(key: string): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );
}

export { BUCKET, REGION };
