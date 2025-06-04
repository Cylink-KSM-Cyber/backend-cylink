import type { Knex } from 'knex';

const tableName = 'conversion_goals';

const foreigns = [
  {
    name: 'user_id',
    reference: 'id',
    table: 'users',
    onDelete: 'CASCADE',
  },
];

const indexes = [
  'user_id',
];

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(tableName, table => {
    table.increments('id');
    
    // loop through foreigns
    foreigns.forEach(foreign => {
      table.integer(foreign.name).notNullable()
        .references(foreign.reference)
        .inTable(foreign.table)
        .onDelete(foreign.onDelete);
    });

    // conversion goal fields
    table.string('name', 255).notNullable();
    table.text('description');

    // timestamps
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());

    // loop through indexes
    indexes.forEach(column => {
      table.index(column, `idx_${tableName}_${column}`);
    });
  });

  // prevent duplicate key error
  await knex.raw(`
    SELECT setval('${tableName}_id_seq', (SELECT MAX(id) FROM ${tableName}), true);
  `);
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
  })
  
  await knex.schema.dropTableIfExists(tableName);
}
