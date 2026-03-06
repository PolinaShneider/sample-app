import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getEnv } from "@/server/env";

const env = getEnv();

const s3Client = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function putObject(
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

export async function getObject(key: string): Promise<ReadableStream | undefined> {
  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
    })
  );
  return response.Body as ReadableStream | undefined;
}

async function streamToBuffer(
  stream:
    | AsyncIterable<Uint8Array>
    | { getReader(): ReadableStreamDefaultReader<Uint8Array> }
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  if (typeof (stream as { getReader?: unknown }).getReader === "function") {
    const reader = (
      stream as { getReader(): ReadableStreamDefaultReader<Uint8Array> }
    ).getReader();
    let done = false;
    while (!done) {
      const { value, done: d } = await reader.read();
      done = d;
      if (value) chunks.push(Buffer.from(value));
    }
  } else {
    for await (const chunk of stream as AsyncIterable<Uint8Array>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
  }
  return Buffer.concat(chunks);
}

export async function getObjectAsBuffer(key: string): Promise<Buffer | null> {
  const body = await getObject(key);
  if (!body) return null;
  return streamToBuffer(body);
}

export async function getPresignedGetUrl(
  key: string,
  expiresInSeconds: number
): Promise<string> {
  return getSignedUrl(
    s3Client,
    new GetObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
    }),
    { expiresIn: expiresInSeconds }
  );
}

export async function getPresignedPutUrl(
  key: string,
  contentType: string
): Promise<string> {
  return getSignedUrl(
    s3Client,
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: 3600 }
  );
}
