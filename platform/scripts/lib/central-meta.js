const EMPTY_CENTRAL_META = {
  central_info: {
    published: null,
    central_text: null,
    responsible: null
  },
  location: {
    city_name: null,
    city_slug: null,
    state_name: null,
    state_uf: null,
    address: null
  },
  contact: {
    email: null,
    phone: null
  },
  social: {
    instagram: null,
    facebook: null
  }
};

function toNullableString(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text || null;
}

function slugifyCity(text) {
  if (!text) return null;
  const slug = String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || null;
}

function buildCentralMetaFromExport(record) {
  const cityName = toNullableString(record.cidade_name);
  return {
    central_info: {
      published: toNullableString(record.published_at),
      central_text: toNullableString(record.content_html),
      responsible: toNullableString(record.responsavel)
    },
    location: {
      city_name: cityName,
      city_slug: cityName ? slugifyCity(cityName) : null,
      state_name: toNullableString(record.estado_name),
      state_uf: toNullableString(record.estado_uf),
      address: toNullableString(record.endereco)
    },
    contact: {
      email: toNullableString(record.email),
      phone: toNullableString(record.telefone)
    },
    social: {
      instagram: toNullableString(record.instagram),
      facebook: toNullableString(record.facebook)
    }
  };
}

function hasStructuredMeta(meta) {
  const parsed = typeof meta === 'string' ? JSON.parse(meta) : meta || {};
  const centralText = parsed.central_info?.central_text;
  const cityName = parsed.location?.city_name;
  const stateName = parsed.location?.state_name;
  const stateUf = parsed.location?.state_uf;
  const address = parsed.location?.address;
  const email = parsed.contact?.email;

  return Boolean(
    centralText ||
      cityName ||
      stateName ||
      stateUf ||
      address ||
      email
  );
}

module.exports = {
  EMPTY_CENTRAL_META,
  buildCentralMetaFromExport,
  hasStructuredMeta,
  slugifyCity
};
