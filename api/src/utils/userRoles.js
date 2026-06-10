function normalizeRoles(roles) {
  if (Array.isArray(roles)) return roles.map((role) => String(role).toLowerCase());
  if (typeof roles === 'string') {
    try {
      const parsed = JSON.parse(roles);
      if (Array.isArray(parsed)) return parsed.map((role) => String(role).toLowerCase());
    } catch {
      return [roles.toLowerCase()];
    }
  }
  return [];
}

function isAdministrator(roles) {
  const normalized = normalizeRoles(roles);
  return normalized.includes('administrator') || normalized.includes('admin');
}

module.exports = { isAdministrator, normalizeRoles };
