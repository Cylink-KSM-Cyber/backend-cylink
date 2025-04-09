const pool = require('@/config/database');
const schema = require('@/database/schema');
const { generateQuery } = require('@/utils/query');

(async () => {
  console.log('Executing database migration...');
  await pool.query(generateQuery.tables.drop(schema));
  await pool.query(generateQuery.tables.create(schema));
  console.info('Migration finished! Closing database connection...');
})();
