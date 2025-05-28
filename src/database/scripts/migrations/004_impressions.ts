import type { Knex } from 'knex';

const tableName = 'impressions';

const foreigns = [
  {
    name: 'url_id',
    reference: 'id',
    table: 'urls',
    onDelete: 'CASCADE',
  },
];

const indexes = [
  'url_id', 'timestamp', 'is_unique',
  'source',
];

const composites = [
  ['url_id', 'timestamp'],
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

    // impression fields
    table.timestamp('timestamp', { useTz: true }).defaultTo(knex.fn.now());
    table.string('ip_address', 45);
    table.text('user_agent');
    table.text('referrer');
    table.boolean('is_unique').defaultTo(false);
    table.string('source', 100);

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
