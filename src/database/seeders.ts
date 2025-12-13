/**
 * Database Seeder Module
 *
 * Provides functionality for seeding the database with initial data
 * @module database/seeders
 */

// const pool = require('@/config/database');
// const { generateQuery } = require('@/utils/query');
const { hash } = require('../libs/bcrypt/bcrypt.service');

/**
 * Seeder interface for a single table
 */
interface TableSeeder {
  columns: string[];
  values: Array<(string | number)[]>;
}

/**
 * Database seeders interface
 */
interface DatabaseSeeders {
  [tableName: string]: TableSeeder;
}

/**
 * Seed data for database tables
 */
const seeders: DatabaseSeeders = {
  users: {
    columns: ['email', 'password', 'role'],
    values: [['admin@localhost', 'securepassword123', 'admin']],
  },
};

/**
 * Hash passwords in the seeder data
 * @param {DatabaseSeeders} seedersData - Seeder data with passwords to hash
 * @returns {Promise<void>}
 */
const hashPasswords = async (seedersData: DatabaseSeeders): Promise<void> => {
  for (const name in seedersData) {
    for (const values of seedersData[name].values) {
      const passwordIndex = seedersData[name].columns.indexOf('password');
      if (passwordIndex !== -1) {
        values[passwordIndex] = await hash(values[passwordIndex] as string);
      }
    }
  }
};

// Unused function for future reference
// const _generateInsertQuery = (columns: Array<string>, values: Array<Array<string>>) => {
//   let query = `INSERT INTO ${name} (${columns.join(', ')})\nVALUES\n`;
//
//   values.forEach((values: any) => {
//     query += `(${values.join(', ')}),\n`;
//   });
//
//   query += ';';
// };

/**
 * Generate SQL queries for seeding the database
 * @param {DatabaseSeeders} seedersData - Seeder data to generate queries for
 * @returns {string} Generated SQL queries
 */
const generateSeederQuery = (seedersData: DatabaseSeeders): string => {
  let query = '';

  for (const name in seedersData) {
    query += `INSERT INTO ${name} (${seedersData[name].columns.join(', ')})\nVALUES\n`;

    seedersData[name].values.forEach(values => {
      query += `(${values.join(', ')}),\n`;
    });

    query += ';';
  }

  return query;
};

/**
 * Main seeder execution function
 */
(async () => {
  await hashPasswords(seeders);
  /* eslint-disable no-console */
  console.info(generateSeederQuery(seeders));
  /* eslint-enable no-console */
})();
