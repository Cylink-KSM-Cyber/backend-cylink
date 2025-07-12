import type { Knex } from 'knex';

const tableName = 'users';

const enums = {
  role: 'users_role',
};

export async function up(knex: Knex): Promise<void> {
  // Check if enum already exists, create only if it doesn't
  const enumExists = await knex.raw(
    `
    SELECT 1 FROM pg_type WHERE typname = ?
  `,
    [enums.role],
  );

  if (enumExists.rows.length === 0) {
    await knex.raw(`CREATE TYPE "${enums.role}" AS ENUM ('user', 'admin')`);
  }

  // Check if table already exists
  const tableExists = await knex.schema.hasTable(tableName);

  if (!tableExists) {
    await knex.schema.createTable(tableName, table => {
      table.increments('id');
      table.string('email', 255).notNullable().unique();
      table.string('password', 255).notNullable();
      table.string('username', 255);

      // Use the enum type directly with raw SQL to avoid Knex enum creation issues
      table.specificType('role', `"${enums.role}"`).defaultTo('user');

      table.string('timezone', 50).defaultTo('UTC');
      table.string('verification_token', 255);
      table.timestamp('email_verified_at');

      // timestamps
      table.timestamps(true, true);
      table.timestamp('deleted_at');
    });

    // prevent duplicate key error - only run if table was just created
    await knex.raw(`
      SELECT setval('${tableName}_id_seq', COALESCE((SELECT MAX(id) FROM ${tableName}), 0) + 1, false);
    `);
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists(tableName);

  // Check if enum exists before trying to drop it
  for (const typeName of Object.values(enums)) {
    const enumExists = await knex.raw(
      `
      SELECT 1 FROM pg_type WHERE typname = ?
    `,
      [typeName],
    );

    if (enumExists.rows.length > 0) {
      await knex.raw(`DROP TYPE IF EXISTS "${typeName}"`);
    }
  }
}
