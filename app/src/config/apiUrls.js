import { API_BASE_URL, YOUTUBE_UPLOAD_URL } from '@env';

export const PRODUCTION_API_BASE_URL = 'https://api-terraorganica-production.up.railway.app';
export const PRODUCTION_YOUTUBE_UPLOAD_URL = `${PRODUCTION_API_BASE_URL}/youtube/upload`;

export function getApiBaseUrl() {
  const configured = String(API_BASE_URL || '').trim().replace(/\/$/, '');
  if (configured) return configured;
  return PRODUCTION_API_BASE_URL;
}

export function getYoutubeUploadUrl() {
  const configured = String(YOUTUBE_UPLOAD_URL || '').trim().replace(/\/$/, '');
  if (configured) return configured;
  return PRODUCTION_YOUTUBE_UPLOAD_URL;
}
