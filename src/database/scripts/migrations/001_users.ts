import type { Knex } from 'knex';

const tableName = 'users';

const enums = {
  role: 'users_role',
};

export async function up(knex: Knex): Promise<void> {
  return knex.schema
    .createTable(tableName, table => {
      table.increments('id');
      table.string('email', 255).notNullable().unique();
      table.string('password', 255).notNullable();
      table.string('username', 255);
      table.enum('role', ['user', 'admin'], { useNative: true, enumName: enums.role }).defaultTo('user');
      table.string('timezone', 50).defaultTo('UTC');
      table.string('verification_token', 255);
      table.timestamp('email_verified_at');

      // timestamps
      table.timestamps(true, true);
      table.timestamp('deleted_at');
    });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists(tableName);

  for (const typeName of Object.values(enums)) {
    await knex.schema.raw(`DROP TYPE IF EXISTS "${typeName}"`);
  }
}
