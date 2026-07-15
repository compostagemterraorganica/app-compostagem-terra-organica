const LITERS_PER_KG = 0.55;
const TOLERANCE = 0.01;

function round2(value) {
  return Math.round(value * 100) / 100;
}

function litersToKg(liters) {
  return round2(Number(liters) * LITERS_PER_KG);
}

function kgToLiters(kg) {
  return round2(Number(kg) / LITERS_PER_KG);
}

function resolveVolumePair({ volume_liters: liters, volume_kg: kg }) {
  const hasLiters = liters !== undefined && liters !== null && liters !== '';
  const hasKg = kg !== undefined && kg !== null && kg !== '';

  if (!hasLiters && !hasKg) {
    return { volume_liters: 0, volume_kg: 0 };
  }

  if (hasLiters && !hasKg) {
    const resolvedLiters = round2(Number(liters));
    return { volume_liters: resolvedLiters, volume_kg: litersToKg(resolvedLiters) };
  }

  if (hasKg && !hasLiters) {
    const resolvedKg = round2(Number(kg));
    return { volume_liters: kgToLiters(resolvedKg), volume_kg: resolvedKg };
  }

  const resolvedLiters = round2(Number(liters));
  const resolvedKg = round2(Number(kg));

  if (Math.abs(litersToKg(resolvedLiters) - resolvedKg) > TOLERANCE) {
    return { volume_liters: resolvedLiters, volume_kg: litersToKg(resolvedLiters) };
  }

  return { volume_liters: resolvedLiters, volume_kg: resolvedKg };
}

module.exports = {
  LITERS_PER_KG,
  TOLERANCE,
  litersToKg,
  kgToLiters,
  resolveVolumePair
};
