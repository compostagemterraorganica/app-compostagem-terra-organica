function toIntOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function toIsoOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toDateOnlyOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function mapUser(raw) {
  const id = toIntOrNull(raw.id ?? raw.ID);
  if (!id) return null;

  return {
    id,
    name: raw.name || raw.display_name || `user-${id}`,
    email: raw.email || raw.user_email || null,
    avatar_url: raw.avatar_urls?.['96'] || raw.avatar_url || raw.avatar || null,
    description: raw.description || null,
    registered_at: toIsoOrNull(raw.registered_date || raw.user_registered),
    roles_json: Array.isArray(raw.roles) ? raw.roles : [],
    capabilities_json: raw.capabilities && typeof raw.capabilities === 'object' ? raw.capabilities : {},
    raw_json: raw
  };
}

function mapCentral(raw) {
  const id = toIntOrNull(raw.id ?? raw.ID);
  if (!id) return null;
  return {
    id,
    slug: raw.slug || null,
    name: raw.title?.rendered || raw.title || raw.name || raw.post_title || `central-${id}`,
    raw_json: raw
  };
}

const LITERS_PER_KG = 0.55;

function litersToKg(liters) {
  return Math.round(Number(liters) * LITERS_PER_KG * 100) / 100;
}

function normalizeWasteType(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  if (normalized === 'verdes' || normalized === 'verde') return 'verdes';
  return 'alimentares';
}

function extractTagNames(raw) {
  const candidates = [
    raw.meta?.tags,
    raw.meta?.tag,
    raw.meta?.['tags-da-central'],
    raw.meta?.etiquetas
  ];

  const names = [];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const list = Array.isArray(candidate)
      ? candidate
      : String(candidate)
          .split(/[,;|]/)
          .map((part) => part.trim())
          .filter(Boolean);
    for (const item of list) {
      const name = String(item?.name || item?.label || item).trim();
      if (name) names.push(name);
    }
  }

  return [...new Set(names)];
}

function mapVolumeVerification(raw) {
  const id = toIntOrNull(raw.id ?? raw.ID);
  const centralId = toIntOrNull(raw.meta?.central);
  if (!id || !centralId) return null;

  const parsedVolume = Number(raw.meta?.volume);
  const volume = Number.isFinite(parsedVolume) && parsedVolume >= 0 ? parsedVolume : 0;
  const volumeKgRaw = Number(raw.meta?.volume_kg ?? raw.meta?.['volume-kg']);
  const volume_kg =
    Number.isFinite(volumeKgRaw) && volumeKgRaw >= 0 ? Math.round(volumeKgRaw * 100) / 100 : litersToKg(volume);

  return {
    id,
    title: raw.title?.rendered || raw.title || null,
    published_at: toIsoOrNull(raw.date),
    measurement_date: toDateOnlyOrNull(raw.meta?.data),
    central_id: centralId,
    volume_liters: volume,
    volume_kg,
    waste_type: normalizeWasteType(raw.meta?.waste_type ?? raw.meta?.['tipo-de-residuo'] ?? raw.meta?.tipo),
    tag_names: extractTagNames(raw),
    video_link: raw.meta?.['link-do-video'] || null,
    post_link: raw.link || null,
    status: raw.status || null,
    raw_json: raw
  };
}

function mapRelationsFromJetRelMap(relMap) {
  const dedupe = new Map();
  const centralIds = Object.keys(relMap || {});

  for (const centralKey of centralIds) {
    const centralId = toIntOrNull(centralKey);
    const entries = Array.isArray(relMap[centralKey]) ? relMap[centralKey] : [];
    if (!centralId) continue;

    for (const item of entries) {
      const userId = toIntOrNull(item.child_object_id || item.id || item.ID);
      if (!userId) continue;
      const key = `${centralId}:${userId}:jet-rel-13`;
      if (!dedupe.has(key)) {
        dedupe.set(key, {
          relation_type: 'jet-rel-13',
          central_id: centralId,
          user_id: userId,
          source: 'jet-rel-map',
          raw_json: item
        });
      }
    }
  }

  return Array.from(dedupe.values());
}

module.exports = {
  mapUser,
  mapCentral,
  mapVolumeVerification,
  mapRelationsFromJetRelMap,
  litersToKg,
  normalizeWasteType,
  extractTagNames,
  LITERS_PER_KG
};
