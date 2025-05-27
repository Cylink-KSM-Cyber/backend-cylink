import type { Knex } from 'knex';

const tableName = 'clicks';

const foreigns = [
  {
    name: 'url_id',
    reference: 'id',
    table: 'urls',
    onDelete: 'CASCADE',
  },
];

const indexes = [
  'url_id', 'clicked_at', 'country',
  'device_type', 'browser',
];

const composites = [
  ['url_id', 'clicked_at'],
];

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable(tableName, table => {
    table.increments('id');
    
    // loop through foreigns
    foreigns.forEach(foreign => {
      table.integer(foreign.name).notNullable()
        .references(foreign.reference)
        .inTable(foreign.table)
        .onDelete(foreign.onDelete);
    });

    // click fields
    table.timestamp('clicked_at', { useTz: true }).defaultTo(knex.fn.now());
    table.string('ip_address', 45);
    table.text('user_agent');
    table.text('referrer');
    table.string('country', 2);
    table.string('device_type', 20);
    table.string('browser', 50);

    // loop through indexes
    indexes.forEach(column => {
      table.index(column, `idx_${tableName}_${column}`);
    });

    // loop through composites
    composites.forEach(composite => {
      table.index(composite, `idx_${tableName}_${composite.join('_')}`);
    });
  });
}

export async function down(knex: Knex): Promise<void> {
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
  })
  
  await knex.schema.dropTableIfExists(tableName);
}
