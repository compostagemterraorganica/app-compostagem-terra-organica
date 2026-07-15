const LITERS_PER_KG = 0.55;

function round2(value) {
  return Math.round(value * 100) / 100;
}

export function litersToKg(liters) {
  const n = Number(String(liters).replace(',', '.'));
  if (!Number.isFinite(n)) return '';
  return String(round2(n * LITERS_PER_KG));
}

export function kgToLiters(kg) {
  const n = Number(String(kg).replace(',', '.'));
  if (!Number.isFinite(n)) return '';
  return String(round2(n / LITERS_PER_KG));
}

export function parseNumericInput(value) {
  const trimmed = String(value || '').trim().replace(',', '.');
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export const WASTE_TYPE_LABELS = {
  alimentares: 'Resíduos alimentares',
  verdes: 'Resíduos verdes'
};
