import type { Knex } from 'knex';

const tableName = 'qr_codes';

const foreigns = [
  {
    name: 'url_id',
    reference: 'id',
    table: 'urls',
    onDelete: 'CASCADE',
  },
];

const indexes = [
  'url_id',
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

    // qr code fields
    table.string('color', 7).notNullable().defaultTo('#000000');
    table.string('background_color').notNullable().defaultTo('#FFFFFF');
    table.boolean('include_logo').notNullable().defaultTo(true);
    table.decimal('logo_size', 3, 2).notNullable()
      .defaultTo(0.2)
      .checkBetween([0.1, 0.3]);
    table.integer('size').notNullable().defaultTo(300);

    // timestamps
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });

    // loop through indexes
    indexes.forEach(column => {
      table.index(column, `idx_${tableName}_${column}`);
    });
  });

  // prevent duplicate key error
  await knex.raw(`
    SELECT setval('${tableName}_id_seq', COALESCE((SELECT MAX(id) FROM ${tableName}), 0) + 1, false);
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
