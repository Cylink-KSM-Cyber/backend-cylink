# Database Migration Best Practices Guide

## Overview

This guide outlines best practices for database migrations using Knex.js in the CyLink project. Following these guidelines ensures consistent, safe, and maintainable database schema changes.

## Migration Workflow

### 1. Creating New Migrations

```bash
# Create a new migration with descriptive name
npm run db:migrate:make add_user_preferences_table

# The migration file will be created in src/database/scripts/migrations/
```

### 2. Migration Structure

All migrations should follow this structure:

```typescript
/**
 * Migration: Add user preferences table
 * Purpose: Store user-specific settings and preferences
 * Dependencies: Requires users table
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('user_preferences', table => {
    table.increments('id').primary();
    table.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('preference_key').notNullable();
    table.text('preference_value');
    table.timestamps(true, true);

    // Add indexes for performance
    table.index(['user_id', 'preference_key']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('user_preferences');
}
```

### 3. Testing Migrations

Before committing, always test your migrations:

```bash
# Check current migration status
npm run db:migrate:status

# Run the migration
npm run db:migrate

# Test rollback
npm run db:migrate:rollback

# Run migration again to ensure it works
npm run db:migrate
```

## Best Practices

### 1. Migration Naming

- Use descriptive, action-oriented names
- Include the table/feature being modified
- Use snake_case for consistency

**Good examples:**

- `add_user_preferences_table`
- `modify_urls_short_code_length`
- `add_index_clicks_created_at`

**Bad examples:**

- `migration_001`
- `fix_bug`
- `update_table`

### 2. Migration Content

#### Always Include Both Up and Down Functions

```typescript
export async function up(knex: Knex): Promise<void> {
  // Forward migration logic
}

export async function down(knex: Knex): Promise<void> {
  // Reverse migration logic
}
```

#### Make Migrations Idempotent

Ensure migrations can be safely run multiple times:

```typescript
export async function up(knex: Knex): Promise<void> {
  // Check if table exists before creating
  if (!(await knex.schema.hasTable('user_preferences'))) {
    return knex.schema.createTable('user_preferences', table => {
      // table definition
    });
  }
}
```

#### Handle Data Migrations Carefully

When migrating data, always handle edge cases:

```typescript
export async function up(knex: Knex): Promise<void> {
  // First, add the new column
  await knex.schema.table('urls', table => {
    table.string('category').nullable();
  });

  // Then, migrate existing data
  await knex('urls').whereNull('category').update({ category: 'general' });
}
```

### 3. Performance Considerations

#### Add Indexes for Performance

```typescript
export async function up(knex: Knex): Promise<void> {
  return knex.schema.table('clicks', table => {
    // Add index for frequently queried columns
    table.index(['url_id', 'clicked_at']);
    table.index('ip_address');
  });
}
```

#### Use Transactions for Complex Operations

```typescript
export async function up(knex: Knex): Promise<void> {
  return knex.transaction(async trx => {
    // All operations within this transaction
    await trx.schema.createTable('new_table', table => {
      // table definition
    });

    await trx('existing_table').insert(defaultData);
  });
}
```

### 4. Schema Changes

#### Column Modifications

```typescript
export async function up(knex: Knex): Promise<void> {
  return knex.schema.table('urls', table => {
    // Modify existing column
    table.string('short_code', 30).alter();
  });
}
```

#### Adding Constraints

```typescript
export async function up(knex: Knex): Promise<void> {
  return knex.schema.table('url_conversion_goals', table => {
    table.unique(['url_id', 'goal_id']);
  });
}
```

### 5. Documentation

#### Include Migration Comments

```typescript
/**
 * Migration: Add user timezone support
 * Purpose: Store user timezone preferences for analytics
 * Breaking Changes: None
 * Dependencies: Requires users table
 * Rollback Safe: Yes
 */
```

#### Document Schema Changes

When making significant schema changes, update the relevant documentation:

- Update API documentation if endpoints are affected
- Update model interfaces in `/src/interfaces/`
- Update any related services or controllers

## Common Migration Patterns

### 1. Adding a New Table

```typescript
export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('table_name', table => {
    table.increments('id').primary();
    table.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('name').notNullable();
    table.text('description').nullable();
    table.timestamps(true, true);

    // Add indexes
    table.index('user_id');
    table.index(['user_id', 'name']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('table_name');
}
```

### 2. Adding Columns

```typescript
export async function up(knex: Knex): Promise<void> {
  return knex.schema.table('users', table => {
    table.string('phone_number').nullable();
    table.boolean('email_notifications').defaultTo(true);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.table('users', table => {
    table.dropColumn('phone_number');
    table.dropColumn('email_notifications');
  });
}
```

### 3. Modifying Columns

```typescript
export async function up(knex: Knex): Promise<void> {
  return knex.schema.table('urls', table => {
    table.string('short_code', 30).alter(); // Increase length
    table.string('title', 500).alter(); // Increase length
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.table('urls', table => {
    table.string('short_code', 10).alter(); // Revert to original
    table.string('title', 255).alter(); // Revert to original
  });
}
```

### 4. Adding Indexes

```typescript
export async function up(knex: Knex): Promise<void> {
  return knex.schema.table('clicks', table => {
    table.index('clicked_at');
    table.index(['url_id', 'clicked_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.table('clicks', table => {
    table.dropIndex('clicked_at');
    table.dropIndex(['url_id', 'clicked_at']);
  });
}
```

## Troubleshooting

### Common Issues

1. **Migration fails with foreign key constraint**

   - Ensure referenced tables exist
   - Create tables in the correct order
   - Use transactions for complex operations

2. **Rollback fails**

   - Always test rollback functions
   - Handle data that may have been modified
   - Use conditional logic for safety

3. **Performance issues**
   - Add appropriate indexes
   - Use batch operations for large data sets
   - Monitor query performance

### Recovery Procedures

If a migration fails:

1. Check the migration status: `npm run db:migrate:status`
2. Rollback if possible: `npm run db:migrate:rollback`
3. Fix the migration file
4. Test the migration again
5. If manual database fixes are needed, document them

## Environment Considerations

### Development

- Migrations run automatically during development
- Use test databases for experimentation
- Always backup before major schema changes

### Staging

- Migrations should be tested in staging first
- Monitor performance impact
- Verify application functionality after migration

### Production

- Schedule migrations during maintenance windows
- Create database backups before migration
- Have rollback procedures ready
- Monitor application health post-migration

## Security Considerations

- Never commit sensitive data in migrations
- Use environment variables for configuration
- Validate data before migration
- Sanitize user input in data migrations

## Conclusion

Following these best practices ensures that database migrations are:

- Safe and reversible
- Performant and efficient
- Well-documented and maintainable
- Consistent across environments

Remember: When in doubt, test your migrations thoroughly and ask for code review before applying to production databases.
