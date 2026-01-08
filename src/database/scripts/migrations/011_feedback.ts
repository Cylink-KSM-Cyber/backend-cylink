import type { Knex } from 'knex';

const tableName = 'feedback';

const enums = {
  type: 'feedback_type',
  status: 'feedback_status',
};

const indexes = ['title', 'score', 'created_at', 'user_id', 'type', 'status'];

const customIndexes = [
  {
    name: 'idx_feedback_title_gin',
    options: `USING gin(to_tsvector('english', coalesce(title, '')))`,
  },
  {
    name: 'idx_feedback_description_gin',
    options: `USING gin(to_tsvector('english', coalesce(description, '')))`,
  },
];

export async function up(knex: Knex): Promise<void> {
  // Check if feedback_type enum exists, create only if it doesn't
  const typeEnumExists = await knex.raw(`SELECT 1 FROM pg_type WHERE typname = ?`, [enums.type]);

  if (typeEnumExists.rows.length === 0) {
    await knex.raw(`CREATE TYPE "${enums.type}" AS ENUM ('bug', 'feature')`);
  }

  // Check if feedback_status enum exists, create only if it doesn't
  const statusEnumExists = await knex.raw(`SELECT 1 FROM pg_type WHERE typname = ?`, [
    enums.status,
  ]);

  if (statusEnumExists.rows.length === 0) {
    await knex.raw(
      `CREATE TYPE "${enums.status}" AS ENUM ('open', 'under_review', 'planned', 'in_progress', 'completed', 'closed')`,
    );
  }

  // Check if table already exists
  const tableExists = await knex.schema.hasTable(tableName);

  if (!tableExists) {
    await knex.schema.createTable(tableName, table => {
      table.increments('id');

      // Core fields
      table.string('title', 255).notNullable();
      table.text('description').notNullable();
      table.specificType('type', `"${enums.type}"`).notNullable();
      table.specificType('status', `"${enums.status}"`).notNullable().defaultTo('open');

      // Foreign key to users
      table.integer('user_id').references('id').inTable('users').onDelete('SET NULL');

      // Vote counts
      table.integer('upvotes').notNullable().defaultTo(1); // Starts with 1 (author auto-upvote)
      table.integer('downvotes').notNullable().defaultTo(0);
      table.integer('score').notNullable().defaultTo(1); // score = upvotes - downvotes

      // Tags stored as JSONB
      table.jsonb('tags');

      // Feature-specific fields
      table.text('use_case');

      // Bug-specific fields
      table.text('reproduction_steps');
      table.text('expected_behavior');
      table.text('actual_behavior');

      // Timestamps
      table.timestamps(true, true);
      table.timestamp('deleted_at');

      // Simple indexes
      indexes.forEach(column => {
        table.index(column, `idx_${tableName}_${column}`);
      });
    });

    // Prevent duplicate key error - only run if table was just created
    await knex.raw(`
      SELECT setval('${tableName}_id_seq', COALESCE((SELECT MAX(id) FROM ${tableName}), 0) + 1, false);
    `);
  }

  // Apply custom indexes (always run these as they use IF NOT EXISTS)
  for (const index of customIndexes) {
    let query = `CREATE INDEX IF NOT EXISTS ${index.name} ON ${tableName}`;

    if (index.options) {
      query += ` ${index.options}`;
    }

    query = query.trim();

    await knex.raw(query);
  }
}

export async function down(knex: Knex): Promise<void> {
  // Check if table exists before trying to modify it
  const tableExists = await knex.schema.hasTable(tableName);

  if (tableExists) {
    await knex.schema.alterTable(tableName, table => {
      // Drop foreign key
      table.dropForeign('user_id');

      // Drop simple indexes
      indexes.forEach(column => {
        table.dropIndex(column, `idx_${tableName}_${column}`);
      });
    });

    // Drop custom indexes
    for (const index of customIndexes) {
      await knex.raw(`DROP INDEX IF EXISTS ${index.name}`);
    }

    // Drop table
    await knex.schema.dropTableIfExists(tableName);
  }

  // Check if enums exist before trying to drop them
  for (const typeName of Object.values(enums)) {
    const enumExists = await knex.raw(`SELECT 1 FROM pg_type WHERE typname = ?`, [typeName]);

    if (enumExists.rows.length > 0) {
      await knex.raw(`DROP TYPE IF EXISTS "${typeName}"`);
    }
  }
}
