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

function parseMeta(meta) {
  return typeof meta === 'string' ? JSON.parse(meta) : meta || {};
}

function hasStructuredMeta(meta) {
  const parsed = parseMeta(meta);
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

function normalizeCentralMeta(input) {
  const src = parseMeta(input);

  const toNullable = (value) => {
    if (value === undefined || value === null) return null;
    const text = String(value).trim();
    return text || null;
  };

  const cityName = toNullable(src.location?.city_name);

  return {
    central_info: {
      published: toNullable(src.central_info?.published),
      central_text: toNullable(src.central_info?.central_text),
      responsible: toNullable(src.central_info?.responsible)
    },
    location: {
      city_name: cityName,
      city_slug: cityName ? slugifyCity(cityName) : null,
      state_name: toNullable(src.location?.state_name),
      state_uf: toNullable(src.location?.state_uf),
      address: toNullable(src.location?.address)
    },
    contact: {
      email: toNullable(src.contact?.email),
      phone: toNullable(src.contact?.phone)
    },
    social: {
      instagram: toNullable(src.social?.instagram),
      facebook: toNullable(src.social?.facebook)
    }
  };
}

module.exports = {
  EMPTY_CENTRAL_META,
  hasStructuredMeta,
  parseMeta,
  normalizeCentralMeta,
  slugifyCity
};
