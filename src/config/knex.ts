require('dotenv').config({
  path: `${__dirname}/../../.env${process.env.NODE_ENV === 'test' ? '.test' : ''}`,
});

import type { Knex } from 'knex';

const config: Knex.Config = {
  client: process.env.DATABASE_DRIVER || 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  },
  searchPath: process.env.DATABASE_SCHEMA?.split(',') || ['public'],
  migrations: {
    directory: __dirname + '/../database/scripts/migrations',
  },
  seeds: {
    directory: __dirname + '/../database/scripts/seeders',
  },
};

module.exports = config;
