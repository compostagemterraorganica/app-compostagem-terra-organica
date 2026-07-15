const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  HeadBucketCommand
} = require('@aws-sdk/client-s3');
const env = require('./env');

let s3Client = null;

function getS3Client() {
  if (s3Client) return s3Client;
  s3Client = new S3Client({ region: env.awsRegion });
  return s3Client;
}

async function assertBucketAccessible() {
  await getS3Client().send(new HeadBucketCommand({ Bucket: env.s3Bucket }));
}

async function uploadFile({ key, body, contentType, metadata = {} }) {
  const storageKey = String(key).replace(/^\//, '');
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: env.s3Bucket,
      Key: storageKey,
      Body: body,
      ContentType: contentType,
      Metadata: Object.fromEntries(
        Object.entries(metadata).map(([k, v]) => [k, String(v)])
      )
    })
  );
  return {
    storageKey,
    bucket: env.s3Bucket,
    sizeBytes: Buffer.isBuffer(body) ? body.length : Buffer.byteLength(body)
  };
}

async function listObjectKeys(prefix) {
  const keys = [];
  let ContinuationToken;

  do {
    const response = await getS3Client().send(
      new ListObjectsV2Command({
        Bucket: env.s3Bucket,
        Prefix: String(prefix || '').replace(/^\//, ''),
        ContinuationToken
      })
    );

    for (const item of response.Contents || []) {
      if (item.Key && !item.Key.endsWith('/')) keys.push(item.Key);
    }
    ContinuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (ContinuationToken);

  return keys.sort();
}

async function downloadObject(key) {
  const storageKey = String(key).replace(/^\//, '');
  const response = await getS3Client().send(
    new GetObjectCommand({
      Bucket: env.s3Bucket,
      Key: storageKey
    })
  );

  const chunks = [];
  for await (const chunk of response.Body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const body = Buffer.concat(chunks);

  return {
    storageKey,
    body,
    contentType: response.ContentType || null,
    sizeBytes: body.length
  };
}

module.exports = {
  getS3Client,
  assertBucketAccessible,
  uploadFile,
  listObjectKeys,
  downloadObject
};
