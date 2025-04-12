const { Pool } = require('pg');

const logger = require('@/utils/logger');
require('dotenv').config({
  // Traces back to root directory (absolute path)
  path: `${__dirname}/../../${process.env.NODE_ENV === 'test' ? '.env.test' : '.env'}`,
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

const setDefaultSchema = async (client: any) => {
  try {
    const searchPath = 'SET search_path TO ' + process.env.DATABASE_SCHEMA;
    await client.query(searchPath);
  } catch (error: any) {
    logger.error(`Database Error: Failed to set search path: ${error.message}`);
  }
}

pool.on('connect', async (client: any) => await setDefaultSchema(client));

// Run a single query inside a transaction. Retries if failed
pool.runTransaction = async (query: string, values = [], retries = 3, delay = 1000) => {
  const client = await pool.connect();

  /* eslint-disable no-await-in-loop */
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await client.query('BEGIN');

      await setDefaultSchema(client);

      let result;

      if (values.length > 0) {
        result = await client.query(query, values);
      } else {
        result = await client.query(query);
      }

      await client.query('COMMIT');

      return result;

    } catch (error: any) {
      await client.query('ROLLBACK');

      logger.error(`Database error: Query attempt ${attempt} failed: ${error.message}`);

      if (attempt === retries) {
        throw new Error(`Transaction failed after ${retries} attempts: ${error.message}`);
      } else {
        logger.info(`Database info: Retrying query in ${delay}ms...`);
        /* eslint-disable no-promise-executor-return */
        await new Promise((resolve) => setTimeout(resolve, delay));
        /* eslint-enable no-promise-executor-return */
      }
    } finally {
      client.release();
    }
  }
  /* eslint-enable no-await-in-loop */
};

module.exports = pool;
