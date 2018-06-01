const { pool } = require('../../lib/connectors/db');
const { createGUID } = require('../../lib/helpers');
/**
 * IMport rep units from NALD to lookup data
 */
async function processRepUnits () {
  const query = `SELECT * FROM import."NALD_REP_UNITS"`;
  const { rows } = await pool.query(query);

  // Delete current list
  await (`DELETE FROM water.lookup WHERE type='NALD_REP_UNITS'`);

  // Build query
  const params = [];
  const insert = [];
  rows.forEach((row) => {
    params.push(createGUID(), row.CODE, row.NAME, JSON.stringify(row));
    insert.push(`($${params.length - 3}, 'NALD_REP_UNITS', $${params.length - 2}, $${params.length - 1}, $${params.length} )`);
  });

  const query2 = `INSERT INTO water.lookup (lookup_id, type, key, value, metadata) VALUES ${insert.join(',')}

  `;

  return pool.query(query2, params);
}

async function run (data) {
  try {
    await processRepUnits();
    return {
      error: null
    };
  } catch (e) {
    console.log(e);
    return {
      error: e.message
    };
  }
}
module.exports = {
  run
};