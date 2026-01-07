import type { Knex } from 'knex';

const tableName = 'feedback_votes';

const enums = {
  voteType: 'feedback_vote_type',
  reason: 'feedback_vote_reason',
};

const foreigns = [
  {
    name: 'feedback_id',
    reference: 'id',
    table: 'feedback',
    onDelete: 'CASCADE',
  },
  {
    name: 'user_id',
    reference: 'id',
    table: 'users',
    onDelete: 'CASCADE',
  },
];

const indexes = ['feedback_id', 'user_id', 'vote_type', 'created_at'];

export async function up(knex: Knex): Promise<void> {
  // Check if feedback_vote_type enum exists, create only if it doesn't
  const voteTypeEnumExists = await knex.raw(`SELECT 1 FROM pg_type WHERE typname = ?`, [
    enums.voteType,
  ]);

  if (voteTypeEnumExists.rows.length === 0) {
    await knex.raw(`CREATE TYPE "${enums.voteType}" AS ENUM ('upvote', 'downvote')`);
  }

  // Check if feedback_vote_reason enum exists, create only if it doesn't
  const reasonEnumExists = await knex.raw(`SELECT 1 FROM pg_type WHERE typname = ?`, [
    enums.reason,
  ]);

  if (reasonEnumExists.rows.length === 0) {
    await knex.raw(
      `CREATE TYPE "${enums.reason}" AS ENUM ('not_useful', 'duplicate', 'unclear', 'out_of_scope', 'other')`,
    );
  }

  // Check if table already exists
  const tableExists = await knex.schema.hasTable(tableName);

  if (!tableExists) {
    await knex.schema.createTable(tableName, table => {
      table.increments('id');

      // Foreign keys
      foreigns.forEach(foreign => {
        table
          .integer(foreign.name)
          .notNullable()
          .references(foreign.reference)
          .inTable(foreign.table)
          .onDelete(foreign.onDelete);
      });

      // Vote type
      table.specificType('vote_type', `"${enums.voteType}"`).notNullable();

      // Downvote-specific fields
      table.specificType('reason', `"${enums.reason}"`);
      table.text('comment');

      // Timestamps
      table.timestamp('created_at').defaultTo(knex.fn.now());

      // Unique constraint: one vote per user per feedback
      table.unique(['feedback_id', 'user_id']);

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
}

export async function down(knex: Knex): Promise<void> {
  // Check if table exists before trying to modify it
  const tableExists = await knex.schema.hasTable(tableName);

  if (tableExists) {
    await knex.schema.alterTable(tableName, table => {
      // Drop foreign keys
      foreigns.forEach(foreign => {
        table.dropForeign(foreign.name);
      });

      // Drop unique constraint
      table.dropUnique(['feedback_id', 'user_id']);

      // Drop simple indexes
      indexes.forEach(column => {
        table.dropIndex(column, `idx_${tableName}_${column}`);
      });
    });

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
