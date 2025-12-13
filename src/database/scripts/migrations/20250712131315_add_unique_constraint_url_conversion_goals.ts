import type { Knex } from 'knex';
import logger from '../../../libs/winston/winston.service';

const tableName = 'url_conversion_goals';
const constraintName = 'unique_url_goal_combination';

export async function up(knex: Knex): Promise<void> {
  // Check if table exists before modifying
  const tableExists = await knex.schema.hasTable(tableName);

  if (tableExists) {
    // Check if unique constraint already exists
    const constraintExists = await knex.raw(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = '${tableName}' 
      AND constraint_type = 'UNIQUE' 
      AND constraint_name = '${constraintName}'
    `);

    if (constraintExists.rows.length === 0) {
      // Add unique constraint using raw SQL for better control
      await knex.raw(`
        ALTER TABLE ${tableName}
        ADD CONSTRAINT ${constraintName} UNIQUE (url_id, goal_id)
      `);

      logger.info(`Added unique constraint '${constraintName}' to table '${tableName}'`);
    } else {
      logger.info(`Unique constraint '${constraintName}' already exists on table '${tableName}'`);
    }
  } else {
    logger.warn(`Table '${tableName}' does not exist, skipping unique constraint addition`);
  }
}

export async function down(knex: Knex): Promise<void> {
  // Check if table exists before modifying
  const tableExists = await knex.schema.hasTable(tableName);

  if (tableExists) {
    // Check if unique constraint exists before dropping
    const constraintExists = await knex.raw(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = '${tableName}' 
      AND constraint_type = 'UNIQUE' 
      AND constraint_name = '${constraintName}'
    `);

    if (constraintExists.rows.length > 0) {
      // Drop unique constraint
      await knex.raw(`
        ALTER TABLE ${tableName}
        DROP CONSTRAINT IF EXISTS ${constraintName}
      `);

      logger.info(`Dropped unique constraint '${constraintName}' from table '${tableName}'`);
    } else {
      logger.info(`Unique constraint '${constraintName}' does not exist on table '${tableName}'`);
    }
  } else {
    logger.warn(`Table '${tableName}' does not exist, skipping unique constraint removal`);
  }
}
