/**
 * Database Configuration
 *
 * Configures and exports PostgreSQL connection pool
 * @module config/database
 */

import { Pool, PoolClient, QueryResult } from 'pg';
import logger from '../utils/logger';
require('dotenv').config({
  // Traces back to root directory (absolute path)
  path: `${__dirname}/../../${process.env.NODE_ENV === 'test' ? '.env.test' : '.env'}`,
});

/**
 * Database connection pool
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

/**
 * Sets the default schema for a database connection
 * @param {PoolClient} client - PostgreSQL client connection
 * @returns {Promise<void>}
 */
const setDefaultSchema = async (client: PoolClient): Promise<void> => {
  try {
    const searchPath = 'SET search_path TO ' + process.env.DATABASE_SCHEMA;
    await client.query(searchPath);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Database Error: Failed to set search path: ${errorMessage}`);
  }
};

pool.on('connect', async (client: PoolClient) => await setDefaultSchema(client));

/**
 * Extended Pool interface with transaction support
 */
interface ExtendedPool extends Pool {
  runTransaction: (
    query: string,
    values?: unknown[],
    retries?: number,
    delay?: number,
  ) => Promise<QueryResult>;
}

/**
 * Run a single query inside a transaction with retry capability
 * @param {string} query - SQL query to execute
 * @param {unknown[]} values - Parameter values for the query
 * @param {number} retries - Number of retry attempts (default: 3)
 * @param {number} delay - Delay between retries in ms (default: 1000)
 * @returns {Promise<QueryResult>} Query result
 */
(pool as ExtendedPool).runTransaction = async (
  query: string,
  values: unknown[] = [],
  retries = 3,
  delay = 1000,
): Promise<QueryResult> => {
  const client = await pool.connect();

  /* eslint-disable no-await-in-loop */
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await client.query('BEGIN');

      await setDefaultSchema(client);

      let result: QueryResult;

      if (values.length > 0) {
        result = await client.query(query, values);
      } else {
        result = await client.query(query);
      }

      await client.query('COMMIT');

      return result;
    } catch (error) {
      await client.query('ROLLBACK');

      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Database error: Query attempt ${attempt} failed: ${errorMessage}`);

      if (attempt === retries) {
        throw new Error(`Transaction failed after ${retries} attempts: ${errorMessage}`);
      } else {
        logger.info(`Database info: Retrying query in ${delay}ms...`);
        /* eslint-disable no-promise-executor-return */
        await new Promise(resolve => setTimeout(resolve, delay));
        /* eslint-enable no-promise-executor-return */
      }
    } finally {
      client.release();
    }
  }
  /* eslint-enable no-await-in-loop */

  // This should never be reached due to the throw in the catch block
  throw new Error('Transaction failed unexpectedly');
};

export = pool as ExtendedPool;
