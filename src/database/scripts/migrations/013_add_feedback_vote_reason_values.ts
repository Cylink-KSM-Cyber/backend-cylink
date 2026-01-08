import type { Knex } from 'knex';

const enumName = 'feedback_vote_reason';

/**
 * Migration: Add missing enum values to feedback_vote_reason
 *
 * Adds: not_reproducible, spam, off_topic
 * to align with frontend DownvoteReason type
 */
export async function up(knex: Knex): Promise<void> {
  // Add new enum values to feedback_vote_reason
  // PostgreSQL requires ALTER TYPE to add enum values
  const newValues = ['not_reproducible', 'spam', 'off_topic'];

  for (const value of newValues) {
    // Check if value already exists to make migration idempotent
    const exists = await knex.raw(
      `SELECT 1 FROM pg_enum WHERE enumlabel = ? AND enumtypid = (SELECT oid FROM pg_type WHERE typname = ?)`,
      [value, enumName],
    );

    if (exists.rows.length === 0) {
      await knex.raw(`ALTER TYPE "${enumName}" ADD VALUE IF NOT EXISTS '${value}'`);
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  // Note: PostgreSQL does not support removing enum values directly
  // This down migration is a no-op as removing enum values requires
  // recreating the type which is complex and risky
  // The extra enum values being present won't cause issues
}
