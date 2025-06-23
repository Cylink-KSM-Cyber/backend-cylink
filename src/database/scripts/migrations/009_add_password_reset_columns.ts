import type { Knex } from 'knex';

const tableName = 'users';

export async function up(knex: Knex): Promise<void> {
  // Check if table exists before modifying
  const tableExists = await knex.schema.hasTable(tableName);

  if (tableExists) {
    // Check if password_reset_token column already exists
    const [tokenColumnExists, expiresColumnExists, requestedColumnExists] = await Promise.all([
      knex.schema.hasColumn(tableName, 'password_reset_token'),
      knex.schema.hasColumn(tableName, 'password_reset_expires_at'),
      knex.schema.hasColumn(tableName, 'password_reset_requested_at'),
    ]);

    await knex.schema.alterTable(tableName, table => {
      // Add password reset token column if it doesn't exist
      if (!tokenColumnExists) {
        table
          .string('password_reset_token', 255)
          .nullable()
          .comment('Secure token for password reset verification');
      }

      // Add password reset expiration timestamp if it doesn't exist
      if (!expiresColumnExists) {
        table
          .timestamp('password_reset_expires_at')
          .nullable()
          .comment('Expiration timestamp for password reset token (1 hour from generation)');
      }

      // Add password reset request timestamp if it doesn't exist
      if (!requestedColumnExists) {
        table
          .timestamp('password_reset_requested_at')
          .nullable()
          .comment('Timestamp when password reset was last requested (for rate limiting)');
      }
    });

    // Create indexes if they don't exist (using raw SQL with IF NOT EXISTS)
    await knex.raw(`
      CREATE INDEX IF NOT EXISTS idx_users_password_reset_token 
      ON users(password_reset_token) 
      WHERE password_reset_token IS NOT NULL;
    `);

    await knex.raw(`
      CREATE INDEX IF NOT EXISTS idx_users_password_reset_expires 
      ON users(password_reset_expires_at) 
      WHERE password_reset_expires_at IS NOT NULL;
    `);

    console.log('Password reset columns and indexes added to users table');
  } else {
    console.log('Users table does not exist, skipping password reset column migration');
  }
}

export async function down(knex: Knex): Promise<void> {
  // Check if table exists before modifying
  const tableExists = await knex.schema.hasTable(tableName);

  if (tableExists) {
    // Drop indexes first
    await knex.raw('DROP INDEX IF EXISTS idx_users_password_reset_token;');
    await knex.raw('DROP INDEX IF EXISTS idx_users_password_reset_expires;');

    // Check if columns exist before dropping
    const tokenColumnExists = await knex.schema.hasColumn(tableName, 'password_reset_token');
    const expiresColumnExists = await knex.schema.hasColumn(tableName, 'password_reset_expires_at');
    const requestedColumnExists = await knex.schema.hasColumn(
      tableName,
      'password_reset_requested_at',
    );

    await knex.schema.alterTable(tableName, table => {
      if (requestedColumnExists) {
        table.dropColumn('password_reset_requested_at');
      }
      if (expiresColumnExists) {
        table.dropColumn('password_reset_expires_at');
      }
      if (tokenColumnExists) {
        table.dropColumn('password_reset_token');
      }
    });

    console.log('Password reset columns and indexes removed from users table');
  }
}
