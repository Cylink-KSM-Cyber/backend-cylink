import type { Knex } from 'knex';
import logger from '../../../libs/winston/winston.service';

const tableName = 'users';

export async function up(knex: Knex): Promise<void> {
  // Check if table exists before modifying
  const tableExists = await knex.schema.hasTable(tableName);

  if (tableExists) {
    // Check if OAuth columns already exist
    const [
      googleIdColumnExists,
      oauthProviderColumnExists,
      oauthAccessTokenColumnExists,
      oauthRefreshTokenColumnExists,
    ] = await Promise.all([
      knex.schema.hasColumn(tableName, 'google_id'),
      knex.schema.hasColumn(tableName, 'oauth_provider'),
      knex.schema.hasColumn(tableName, 'oauth_access_token'),
      knex.schema.hasColumn(tableName, 'oauth_refresh_token'),
    ]);

    await knex.schema.alterTable(tableName, table => {
      // Add google_id column if it doesn't exist
      if (!googleIdColumnExists) {
        table
          .string('google_id', 255)
          .nullable()
          .unique()
          .comment('Unique Google user ID for OAuth authentication');
      }

      // Add oauth_provider column if it doesn't exist
      if (!oauthProviderColumnExists) {
        table
          .string('oauth_provider', 50)
          .nullable()
          .comment('OAuth provider name (e.g., google, facebook)');
      }

      // Add oauth_access_token column if it doesn't exist
      if (!oauthAccessTokenColumnExists) {
        table
          .text('oauth_access_token')
          .nullable()
          .comment('OAuth access token (encrypted for security)');
      }

      // Add oauth_refresh_token column if it doesn't exist
      if (!oauthRefreshTokenColumnExists) {
        table
          .text('oauth_refresh_token')
          .nullable()
          .comment('OAuth refresh token (encrypted for security)');
      }
    });

    // Make password column nullable for OAuth users
    await knex.raw(`
      ALTER TABLE ${tableName} 
      ALTER COLUMN password DROP NOT NULL;
    `);

    // Create index on google_id for performance (using raw SQL with IF NOT EXISTS)
    await knex.raw(`
      CREATE INDEX IF NOT EXISTS idx_users_google_id 
      ON ${tableName}(google_id) 
      WHERE google_id IS NOT NULL;
    `);

    logger.info('OAuth columns and indexes added to users table');
  } else {
    logger.warn('Users table does not exist, skipping OAuth column migration');
  }
}

export async function down(knex: Knex): Promise<void> {
  // Check if table exists before modifying
  const tableExists = await knex.schema.hasTable(tableName);

  if (tableExists) {
    // Drop index first
    await knex.raw('DROP INDEX IF EXISTS idx_users_google_id;');

    // Check if columns exist before dropping
    const googleIdColumnExists = await knex.schema.hasColumn(tableName, 'google_id');
    const oauthProviderColumnExists = await knex.schema.hasColumn(tableName, 'oauth_provider');
    const oauthAccessTokenColumnExists = await knex.schema.hasColumn(
      tableName,
      'oauth_access_token',
    );
    const oauthRefreshTokenColumnExists = await knex.schema.hasColumn(
      tableName,
      'oauth_refresh_token',
    );

    await knex.schema.alterTable(tableName, table => {
      if (oauthRefreshTokenColumnExists) {
        table.dropColumn('oauth_refresh_token');
      }
      if (oauthAccessTokenColumnExists) {
        table.dropColumn('oauth_access_token');
      }
      if (oauthProviderColumnExists) {
        table.dropColumn('oauth_provider');
      }
      if (googleIdColumnExists) {
        table.dropColumn('google_id');
      }
    });

    // Make password column NOT NULL again
    await knex.raw(`
      ALTER TABLE ${tableName} 
      ALTER COLUMN password SET NOT NULL;
    `);

    logger.info('OAuth columns and indexes removed from users table');
  }
}
