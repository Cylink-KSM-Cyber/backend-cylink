/**
 * Conversion Tracking Migration
 *
 * Adds tables for conversion goals, URL goal associations, and conversions
 * @module database/migrations/conversion_tracking
 */

import { PoolClient } from 'pg';

/**
 * Apply migration: create conversion tracking tables
 * @param {PoolClient} client - Database client
 * @returns {Promise<void>}
 */
export const up = async (client: PoolClient): Promise<void> => {
  // Create conversion goals table
  await client.query(`
    CREATE TABLE conversion_goals (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE
    )
  `);

  // Create URL conversion goals association table
  await client.query(`
    CREATE TABLE url_conversion_goals (
      id SERIAL PRIMARY KEY,
      url_id INTEGER NOT NULL REFERENCES urls(id) ON DELETE CASCADE,
      goal_id INTEGER NOT NULL REFERENCES conversion_goals(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(url_id, goal_id)
    )
  `);

  // Create conversions table
  await client.query(`
    CREATE TABLE conversions (
      id SERIAL PRIMARY KEY,
      click_id INTEGER REFERENCES clicks(id) ON DELETE SET NULL,
      url_id INTEGER NOT NULL REFERENCES urls(id) ON DELETE CASCADE,
      goal_id INTEGER REFERENCES conversion_goals(id) ON DELETE SET NULL,
      conversion_value DECIMAL(10, 2),
      converted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      user_agent TEXT,
      ip_address VARCHAR(45),
      referrer TEXT,
      custom_data JSONB
    )
  `);

  // Add indexes for better query performance
  await client.query(`CREATE INDEX idx_conversions_url_id ON conversions(url_id)`);
  await client.query(`CREATE INDEX idx_conversions_click_id ON conversions(click_id)`);
  await client.query(`CREATE INDEX idx_conversions_goal_id ON conversions(goal_id)`);
  await client.query(`CREATE INDEX idx_conversions_converted_at ON conversions(converted_at)`);
};

/**
 * Revert migration: drop conversion tracking tables
 * @param {PoolClient} client - Database client
 * @returns {Promise<void>}
 */
export const down = async (client: PoolClient): Promise<void> => {
  // Drop in reverse order to avoid foreign key constraints
  await client.query(`DROP TABLE IF EXISTS conversions`);
  await client.query(`DROP TABLE IF EXISTS url_conversion_goals`);
  await client.query(`DROP TABLE IF EXISTS conversion_goals`);
};
