const { decodeHtmlEntities } = require('../../utils/htmlEntities');
const { isLogoUrl, pickStoredListingImage } = require('./centrals-images.service');
const { hasStructuredMeta, parseMeta } = require('./central-meta');

function stripHtml(html) {
  if (!html) return '';
  return decodeHtmlEntities(String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

function pickMeta(raw) {
  const meta = raw?.meta || {};
  return {
    address: meta.endereco || meta.address || meta['endereco-da-central'] || null,
    city: meta.cidade || meta.city || null,
    state: meta.estado || meta.uf || meta.state || null,
    email: meta.email || meta['e-mail'] || null
  };
}

function pickFromStructuredMeta(rowMeta) {
  const meta = parseMeta(rowMeta);
  return {
    published_at: meta.central_info?.published || null,
    responsible: meta.central_info?.responsible || null,
    content_html: meta.central_info?.central_text || null,
    address: meta.location?.address || null,
    city: meta.location?.city_name || null,
    city_slug: meta.location?.city_slug || null,
    state: meta.location?.state_name || meta.location?.state_uf || null,
    state_uf: meta.location?.state_uf || null,
    email: meta.contact?.email || null,
    phone: meta.contact?.phone || null,
    instagram: meta.social?.instagram || null,
    facebook: meta.social?.facebook || null
  };
}

function pickImageFromContent(raw) {
  const html = raw?.content?.rendered || raw?.excerpt?.rendered || '';
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (match && !isLogoUrl(match[1])) return match[1];
  return null;
}

function pickImageUrl(raw) {
  const stored = pickStoredListingImage(raw);
  if (stored) return stored;

  const embedded = raw?._embedded?.['wp:featuredmedia']?.[0];
  if (embedded?.source_url && !isLogoUrl(embedded.source_url)) return embedded.source_url;
  if (embedded?.media_details?.sizes?.medium?.source_url && !isLogoUrl(embedded.media_details.sizes.medium.source_url)) {
    return embedded.media_details.sizes.medium.source_url;
  }

  const meta = raw?.meta || {};
  const metaImage = meta.imagem || meta.image || meta.foto || meta['imagem-da-central'];
  if (typeof metaImage === 'string' && metaImage.startsWith('http') && !isLogoUrl(metaImage)) return metaImage;

  const contentImage = pickImageFromContent(raw);
  if (contentImage) return contentImage;

  return null;
}

function pickExcerpt(raw) {
  const rendered = raw?.excerpt?.rendered;
  if (rendered) return stripHtml(rendered);
  return stripHtml(raw?.excerpt || '');
}

function pickContentHtml(raw) {
  return raw?.content?.rendered || raw?.content_html || '';
}

function decodeNullable(value) {
  if (value === undefined || value === null || value === '') return null;
  return decodeHtmlEntities(String(value));
}

function roundVolume(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num);
}

function mapPublicCentral(row, { verifications = [], listingImageUrl = null } = {}) {
  const raw = typeof row.raw_json === 'string' ? JSON.parse(row.raw_json) : row.raw_json || {};
  const structured = hasStructuredMeta(row.meta) ? pickFromStructuredMeta(row.meta) : null;
  const legacyMeta = pickMeta(raw);
  const imageUrl = row.image_url || listingImageUrl || pickImageUrl(raw);

  const contentHtml = structured?.content_html || pickContentHtml(raw);
  const excerpt = pickExcerpt(raw) || (structured?.content_html ? stripHtml(structured.content_html) : '');

  return {
    id: row.id,
    slug: row.slug,
    name: decodeHtmlEntities(row.name || ''),
    excerpt: excerpt || null,
    content_html: contentHtml || null,
    image_url: imageUrl,
    address: decodeNullable(structured?.address ?? legacyMeta.address),
    city: decodeNullable(structured?.city ?? legacyMeta.city),
    city_slug: decodeNullable(structured?.city_slug),
    state: decodeNullable(structured?.state ?? legacyMeta.state),
    state_uf: decodeNullable(structured?.state_uf),
    email: decodeNullable(structured?.email ?? legacyMeta.email),
    phone: decodeNullable(structured?.phone),
    instagram: decodeNullable(structured?.instagram),
    facebook: decodeNullable(structured?.facebook),
    responsible: decodeNullable(structured?.responsible),
    published_at: structured?.published_at || null,
    total_volume_liters: roundVolume(row.total_volume_liters),
    avg_volume_liters: roundVolume(row.avg_volume_liters),
    verification_count: Number(row.verification_count) || 0,
    verifications: verifications.map((v) => ({
      id: v.id,
      title: decodeHtmlEntities(v.title || ''),
      volume_liters: roundVolume(v.volume_liters),
      volume_kg: roundVolume(v.volume_kg),
      measurement_date: v.measurement_date,
      video_link: v.video_link || null
    }))
  };
}

module.exports = {
  mapPublicCentral,
  stripHtml,
  pickMeta,
  pickImageUrl,
  pickFromStructuredMeta
};
