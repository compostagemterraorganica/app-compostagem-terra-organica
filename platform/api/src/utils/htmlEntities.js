/**
 * Converte entidades HTML comuns (ex.: &#8211; &ndash;) em caracteres Unicode.
 * Dados migrados do WordPress costumam vir com entidades no texto.
 */
const NAMED_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00A0',
  ndash: '\u2013',
  mdash: '\u2014',
  hellip: '\u2026'
};

function decodeHtmlEntities(input) {
  if (input == null) return '';
  let s = String(input);
  if (!s.includes('&')) return s;

  s = s.replace(/&#x([0-9a-fA-F]{1,6});?/gi, (_, hex) => {
    const code = parseInt(hex, 16);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : _;
  });
  s = s.replace(/&#(\d{1,7});?/g, (_, num) => {
    const code = parseInt(num, 10);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : _;
  });
  s = s.replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (full, name) => {
    const key = name.toLowerCase();
    return Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, key) ? NAMED_ENTITIES[key] : full;
  });
  return s;
}

module.exports = { decodeHtmlEntities };
