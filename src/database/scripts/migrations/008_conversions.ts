import type { Knex } from 'knex';

const tableName = 'conversions';

const foreigns = [
  {
    name: 'click_id',
    reference: 'id',
    table: 'clicks',
    onDelete: 'SET NULL',
  },
  {
    name: 'url_id',
    reference: 'id',
    table: 'urls',
    onDelete: 'CASCADE',
  },
  {
    name: 'goal_id',
    reference: 'id',
    table: 'conversion_goals',
    onDelete: 'SET NULL',
  },
];

const indexes = ['url_id', 'click_id', 'goal_id', 'converted_at'];

const composites = [
  ['url_id', 'goal_id'],
  ['url_id', 'converted_at'],
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

      // conversion fields
      table.decimal('conversion_value', 10, 2);
      table.timestamp('converted_at', { useTz: true }).defaultTo(knex.fn.now());
      table.text('user_agent');
      table.string('ip_address', 45);
      table.text('referrer');
      table.jsonb('custom_data');

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
      SELECT setval('${tableName}_id_seq', COALESCE((SELECT MAX(id) FROM ${tableName}), 0) + 1, false);
    `);
  }
}

export async function down(knex: Knex): Promise<void> {
  // Check if table exists before trying to modify it
  const tableExists = await knex.schema.hasTable(tableName);

  if (tableExists) {
    await knex.schema.alterTable(tableName, table => {
      foreigns.forEach(foreign => {
        // drop foreign keys
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

    await knex.schema.dropTableIfExists(tableName);
  }
}
