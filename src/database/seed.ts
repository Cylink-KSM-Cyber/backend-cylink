/**
 * Database Seeder CLI
 *
 * Provides a command-line interface for running database seeders
 * @module database/seed
 */

// Set up module aliases before anything else
// import '../moduleAlias';
require('dotenv').config();

import { runAllSeeders, runSeeder } from './seeders/index';

/**
 * Main CLI entry point
 *
 * Usage:
 *   npm run db:seed -- [seeder-name]
 *
 * Examples:
 *   npm run db:seed           # Run all seeders
 *   npm run db:seed -- admin  # Run only the admin seeder
 */
(async () => {
  try {
    const targetSeeder = process.argv[2];

    if (targetSeeder) {
      await runSeeder(targetSeeder);
    } else {
      await runAllSeeders();
    }

    /* eslint-disable no-console */
    console.info('Database seeding completed successfully!');
    /* eslint-enable no-console */

    process.exit(0);
  } catch (error) {
    /* eslint-disable no-console */
    console.error('Database seeding failed:', error);
    /* eslint-enable no-console */

    process.exit(1);
  }
})();
