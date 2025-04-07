const tables = require('@/database/tables');
const pool = require('@/config/database');
const { generateQuery } = require('@/utils/query');

console.log('Executing database migration...');
(async () => {
  await pool.query(generateQuery.table.create(tables));
  await pool.query(generateQuery.table.drop(tables));
})();
