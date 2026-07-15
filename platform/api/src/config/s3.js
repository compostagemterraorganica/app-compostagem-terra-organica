const {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  HeadBucketCommand,
  DeleteObjectCommand
} = require('@aws-sdk/client-s3');
const { HttpError } = require('../utils/httpError');

let s3Client = null;

function hasAwsCredentials() {
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) return true;
  if (process.env.AWS_PROFILE?.trim()) return true;
  return false;
}

function isS3Configured() {
  return Boolean(process.env.S3_BUCKET?.trim() && process.env.AWS_REGION?.trim());
}

function getS3Config() {
  const bucket = process.env.S3_BUCKET || '';
  const region = process.env.AWS_REGION || '';
  const publicBase = (process.env.S3_PUBLIC_BASE || '').replace(/\/$/, '');
  const mediaPrefix = (process.env.S3_MEDIA_PREFIX || 'media').replace(/^\/|\/$/g, '');

  return { bucket, region, publicBase, mediaPrefix };
}

function assertS3Configured() {
  const { bucket, region } = getS3Config();
  if (!bucket) throw new HttpError(500, 'S3_BUCKET nao configurado');
  if (!region) throw new HttpError(500, 'AWS_REGION nao configurado');
}

function getS3Client() {
  if (s3Client) return s3Client;
  assertS3Configured();
  const { region } = getS3Config();
  s3Client = new S3Client({ region });
  return s3Client;
}

function buildPublicUrl(storageKey) {
  const { publicBase, bucket, region } = getS3Config();
  const key = String(storageKey).replace(/^\//, '');
  if (publicBase) return `${publicBase}/${key}`;
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

function buildMediaKey(filename) {
  const { mediaPrefix } = getS3Config();
  const safeName = String(filename).replace(/[^\w.-]/g, '_');
  return `${mediaPrefix}/${safeName}`;
}

async function uploadBuffer({ key, buffer, mimeType, metadata = {} }) {
  assertS3Configured();
  const { bucket } = getS3Config();
  const storageKey = String(key).replace(/^\//, '');

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: storageKey,
      Body: buffer,
      ContentType: mimeType,
      Metadata: Object.fromEntries(
        Object.entries(metadata).map(([k, v]) => [k, String(v)])
      )
    })
  );

  return {
    storageKey,
    publicUrl: buildPublicUrl(storageKey),
    mimeType,
    sizeBytes: buffer.length
  };
}

async function fileExists(storageKey) {
  const { bucket } = getS3Config();
  const key = String(storageKey).replace(/^\//, '');
  try {
    await getS3Client().send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) return false;
    throw error;
  }
}

async function deleteObject(storageKey) {
  const { bucket } = getS3Config();
  const key = String(storageKey).replace(/^\//, '');
  await getS3Client().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

async function bucketExists() {
  const { bucket } = getS3Config();
  try {
    await getS3Client().send(new HeadBucketCommand({ Bucket: bucket }));
    return true;
  } catch (error) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) return false;
    throw error;
  }
}

module.exports = {
  hasAwsCredentials,
  isS3Configured,
  getS3Config,
  assertS3Configured,
  getS3Client,
  buildPublicUrl,
  buildMediaKey,
  uploadBuffer,
  fileExists,
  deleteObject,
  bucketExists
};
