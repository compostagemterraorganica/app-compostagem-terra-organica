const fs = require('fs');
const path = require('path');
const { Storage } = require('@google-cloud/storage');
const { HttpError } = require('../utils/httpError');

let storageClient = null;

function isGcsConfigured() {
  return Boolean(process.env.GCS_BUCKET && process.env.GOOGLE_APPLICATION_CREDENTIALS);
}

function getGcsConfig() {
  const bucket = process.env.GCS_BUCKET || '';
  const publicBase = (process.env.GCS_PUBLIC_BASE || '').replace(/\/$/, '');
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || '';
  const mediaPrefix = (process.env.GCS_MEDIA_PREFIX || 'media').replace(/^\/|\/$/g, '');

  return { bucket, publicBase, credentialsPath, mediaPrefix };
}

function assertGcsConfigured() {
  const { bucket, credentialsPath } = getGcsConfig();
  if (!bucket) throw new HttpError(500, 'GCS_BUCKET nao configurado');
  if (!credentialsPath) throw new HttpError(500, 'GOOGLE_APPLICATION_CREDENTIALS nao configurado');
  if (!fs.existsSync(credentialsPath)) {
    throw new HttpError(500, `Arquivo de credenciais GCS nao encontrado: ${credentialsPath}`);
  }
}

function getStorageClient() {
  if (storageClient) return storageClient;
  assertGcsConfigured();
  storageClient = new Storage({
    keyFilename: getGcsConfig().credentialsPath
  });
  return storageClient;
}

function getBucket() {
  const { bucket } = getGcsConfig();
  return getStorageClient().bucket(bucket);
}

function buildPublicUrl(storageKey) {
  const { publicBase, bucket } = getGcsConfig();
  const key = String(storageKey).replace(/^\//, '');
  if (publicBase) return `${publicBase}/${key}`;
  return `https://storage.googleapis.com/${bucket}/${key}`;
}

function buildMediaKey(filename) {
  const { mediaPrefix } = getGcsConfig();
  const safeName = String(filename).replace(/[^\w.-]/g, '_');
  return `${mediaPrefix}/${safeName}`;
}

async function uploadBuffer({ key, buffer, mimeType, metadata = {} }) {
  assertGcsConfigured();
  const storageKey = String(key).replace(/^\//, '');
  const file = getBucket().file(storageKey);
  await file.save(buffer, {
    resumable: false,
    metadata: {
      contentType: mimeType,
      metadata
    }
  });
  return {
    storageKey,
    publicUrl: buildPublicUrl(storageKey),
    mimeType,
    sizeBytes: buffer.length
  };
}

async function fileExists(storageKey) {
  const [exists] = await getBucket().file(String(storageKey).replace(/^\//, '')).exists();
  return exists;
}

async function deleteObject(storageKey) {
  const key = String(storageKey).replace(/^\//, '');
  await getBucket().file(key).delete({ ignoreNotFound: true });
}

module.exports = {
  isGcsConfigured,
  getGcsConfig,
  assertGcsConfigured,
  getStorageClient,
  getBucket,
  buildPublicUrl,
  buildMediaKey,
  uploadBuffer,
  fileExists,
  deleteObject
};
