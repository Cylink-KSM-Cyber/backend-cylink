import type { Knex } from 'knex';

const tableName = 'urls';

const foreigns = [
  {
    name: 'user_id',
    reference: 'id',
    table: 'users',
    onDelete: 'SET NULL',
  },
];

const indexes = [
  'short_code',
  'user_id',
  'created_at',
  'expiry_date',
  'deleted_at',
  'is_active',
  'original_url',
  'title',
];

const composites = [
  ['is_active', 'deleted_at'],
  ['user_id', 'is_active', 'deleted_at'],
];

const customIndexes = [
  {
    name: 'idx_urls_expiry_active_deleted',
    indexes: ['expiry_date', 'is_active', 'deleted_at'],
    options: 'WHERE expiry_date IS NOT NULL',
  },
  {
    name: 'idx_urls_lower_title',
    indexes: ['LOWER(title)'],
  },
  {
    name: 'idx_urls_lower_short_code',
    indexes: ['LOWER(short_code)'],
  },
  {
    name: 'idx_urls_lower_original_url',
    indexes: ['LOWER(original_url)'],
  },
  {
    name: 'idx_urls_title_gin',
    options: `USING gin(to_tsvector('english', coalesce(title, '')))`,
  },
  {
    name: 'idx_urls_short_code_gin',
    options: `USING gin(to_tsvector('english', short_code))`,
  },
  {
    name: 'idx_urls_original_url_gin',
    options: `USING gin(to_tsvector('english', original_url))`,
  },
];

export async function up(knex: Knex): Promise<void> {
  // Check if table already exists
  const tableExists = await knex.schema.hasTable(tableName);

  if (!tableExists) {
    await knex.schema.createTable(tableName, table => {
      table.increments('id');

      // loop through foreigns
      foreigns.forEach(foreign => {
        let column = table.integer(foreign.name);

        if (foreign.onDelete === 'CASCADE') {
          column = column.notNullable();
        }

        column.references(foreign.reference).inTable(foreign.table).onDelete(foreign.onDelete);
      });

      // url fields
      table.text('original_url').notNullable();
      table.string('short_code', 30).notNullable().unique();
      table.string('title', 255),
        // expiry and activity tracking
        table.timestamp('expiry_date', { useTz: true });
      table.timestamp('auto_expired_at', { useTz: true });
      table.boolean('is_active').defaultTo(true);
      table.boolean('has_password').defaultTo(false);
      table.string('password_hash', 255);
      table.string('redirect_type', 3).defaultTo('302');

      // timestamps
      table.timestamps(true, true);
      table.timestamp('deleted_at');

      // loop through indexes
      indexes.forEach(column => {
        table.index(column, `idx_${tableName}_${column}`);
      });

      // loop through composites
      composites.forEach(composite => {
        table.index(composite, `idx_${tableName}_${composite.join('_')}`);
      });
    });

    // prevent duplicate key error - only run if table was just created
    await knex.raw(`
      SELECT setval('${tableName}_id_seq', COALESCE((SELECT MAX(id) FROM ${tableName}), 0), true);
    `);
  }

  // apply custom indexes (always run these as they use IF NOT EXISTS)
  for (const index of customIndexes) {
    let query = `CREATE INDEX IF NOT EXISTS ${index.name} ON ${tableName}`;

    if (index.indexes && index.indexes.length > 0) {
      query += ` (${index.indexes.join(', ')})`;
    }

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
      // Drop foreign keys
      foreigns.forEach(foreign => {
        table.dropForeign(foreign.name);
      });

      // Drop simple indexes
      indexes.forEach(column => {
        table.dropIndex(column, `idx_${tableName}_${column}`);
      });

      // Drop composite indexes
      composites.forEach(composite => {
        table.dropIndex(composite, `idx_${tableName}_${composite.join('_')}`);
      });
    });

    // Drop custom indexes
    for (const index of customIndexes) {
      await knex.raw(`DROP INDEX IF EXISTS ${index.name}`);
    }

    // Drop table
    await knex.schema.dropTableIfExists(tableName);
  }
}
