async function countTable(pool, tableName) {
  const result = await pool.query(`SELECT COUNT(*)::int AS count FROM ${tableName}`);
  return result.rows[0]?.count ?? 0;
}

async function countMissingVerificationCentrals(pool) {
  const result = await pool.query(`
    SELECT COUNT(*)::int AS count
    FROM volume_verifications v
    LEFT JOIN centrals c ON c.id = v.central_id
    WHERE c.id IS NULL
  `);
  return result.rows[0]?.count ?? 0;
}

async function countDuplicateRelations(pool) {
  const result = await pool.query(`
    SELECT COUNT(*)::int AS count FROM (
      SELECT central_id, user_id, relation_type, COUNT(*) as qty
      FROM user_central_relations
      GROUP BY central_id, user_id, relation_type
      HAVING COUNT(*) > 1
    ) d
  `);
  return result.rows[0]?.count ?? 0;
}

async function countPostsByStatus(pool) {
  const result = await pool.query(`
    SELECT COALESCE(status, 'null') AS status, COUNT(*)::int AS count
    FROM posts
    GROUP BY COALESCE(status, 'null')
    ORDER BY status
  `);
  return result.rows;
}

async function buildValidationReport(pool, sourceCounts) {
  const dbCounts = {
    users: await countTable(pool, 'users'),
    centrals: await countTable(pool, 'centrals'),
    volume_verifications: await countTable(pool, 'volume_verifications'),
    user_central_relations: await countTable(pool, 'user_central_relations'),
    posts: await countTable(pool, 'posts')
  };

  const integrity = {
    missing_verification_centrals: await countMissingVerificationCentrals(pool),
    duplicate_relations: await countDuplicateRelations(pool)
  };

  return {
    generatedAt: new Date().toISOString(),
    sourceCounts,
    dbCounts,
    integrity,
    postsByStatus: await countPostsByStatus(pool)
  };
}

module.exports = { buildValidationReport };
