/**
 * Add last_login to users & Create user_logins Table
 *
 * Migration to add a last_login timestamp column to the users table and create a user_logins table
 * for tracking login history, including user_id, login_at, ip_address, and user_agent.
 *
 * @module database/scripts/migrations/add_last_login_and_user_logins_table
 */
import type { Knex } from 'knex';

const USERS_TABLE = 'users';
const USER_LOGINS_TABLE = 'user_logins';

export async function up(knex: Knex): Promise<void> {
  // Add last_login column to users table if it doesn't exist
  const hasLastLogin = await knex.schema.hasColumn(USERS_TABLE, 'last_login');
  if (!hasLastLogin) {
    await knex.schema.alterTable(USERS_TABLE, table => {
      table
        .timestamp('last_login')
        .nullable()
        .comment("Timestamp of the user's last successful login");
    });
  }

  // Create user_logins table if it doesn't exist
  const hasUserLogins = await knex.schema.hasTable(USER_LOGINS_TABLE);
  if (!hasUserLogins) {
    await knex.schema.createTable(USER_LOGINS_TABLE, table => {
      table.increments('id').primary();
      table
        .integer('user_id')
        .notNullable()
        .references('id')
        .inTable(USERS_TABLE)
        .onDelete('CASCADE');
      table
        .timestamp('login_at')
        .notNullable()
        .defaultTo(knex.fn.now())
        .comment('Timestamp of login event');
      table.string('ip_address', 45).nullable().comment('IP address at login');
      table.string('user_agent', 512).nullable().comment('User agent string at login');
      table.index(['user_id', 'login_at'], 'idx_user_logins_user_id_login_at');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  // Drop user_logins table if exists
  const hasUserLogins = await knex.schema.hasTable(USER_LOGINS_TABLE);
  if (hasUserLogins) {
    await knex.schema.dropTable(USER_LOGINS_TABLE);
  }
  // Drop last_login column from users table if exists
  const hasLastLogin = await knex.schema.hasColumn(USERS_TABLE, 'last_login');
  if (hasLastLogin) {
    await knex.schema.alterTable(USERS_TABLE, table => {
      table.dropColumn('last_login');
    });
  }
}
