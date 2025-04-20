/**
 * Database Seeders Index
 *
 * Provides functionality for executing all registered seeders
 * @module database/seeders/index
 */

import { AdminSeeder } from './adminSeeder';
import { UrlSeeder } from './urlSeeder';
import { QrCodeSeeder } from './qrCodeSeeder';
import { ClickSeeder } from './clickSeeder';
import { ConversionGoalSeeder } from './conversionGoalSeeder';
import { ConversionSeeder } from './conversionSeeder';
import { ImpressionSeeder } from './impressionsSeeder';

/**
 * Registers all available seeders
 * @returns {Array<{name: string, seeder: any}>} Array of seeder objects with their names
 */
const getRegisteredSeeders = () => [
  { name: 'admin', seeder: AdminSeeder },
  { name: 'urls', seeder: UrlSeeder },
  { name: 'qrcodes', seeder: QrCodeSeeder },
  { name: 'clicks', seeder: ClickSeeder },
  { name: 'impressions', seeder: ImpressionSeeder },
  { name: 'goals', seeder: ConversionGoalSeeder },
  { name: 'conversions', seeder: ConversionSeeder },
];

/**
 * Executes all registered seeders
 * @returns {Promise<void>}
 */
const runAllSeeders = async (): Promise<void> => {
  console.log('Starting database seeding...');

  const seeders = getRegisteredSeeders();

  for (const { name, seeder } of seeders) {
    try {
      console.log(`Running ${name} seeder...`);
      const instance = new seeder();
      await instance.seed();
      console.log(`${name} seeder completed successfully.`);
    } catch (error) {
      console.error(`Error running ${name} seeder:`, error);
      throw error;
    }
  }

  console.log('All seeders completed successfully!');
};

/**
 * Executes a specific seeder by name
 * @param {string} name - Name of the seeder to run
 * @returns {Promise<void>}
 */
const runSeeder = async (name: string): Promise<void> => {
  console.log(`Starting '${name}' seeder...`);

  const seeders = getRegisteredSeeders();
  const targetSeeder = seeders.find(seeder => seeder.name === name);

  if (!targetSeeder) {
    throw new Error(
      `Seeder '${name}' not found. Available seeders: ${seeders.map(s => s.name).join(', ')}`,
    );
  }

  try {
    const instance = new targetSeeder.seeder();
    await instance.seed();
    console.log(`'${name}' seeder completed successfully!`);
  } catch (error) {
    console.error(`Error running '${name}' seeder:`, error);
    throw error;
  }
};

// Export functions to be used by CLI scripts
export { runAllSeeders, runSeeder };

// Allow direct execution
if (require.main === module) {
  (async () => {
    try {
      // Check if a specific seeder name was provided
      const targetSeeder = process.argv[2];

      if (targetSeeder) {
        await runSeeder(targetSeeder);
      } else {
        await runAllSeeders();
      }

      process.exit(0);
    } catch (error) {
      console.error('Seeding failed:', error);
      process.exit(1);
    }
  })();
}
