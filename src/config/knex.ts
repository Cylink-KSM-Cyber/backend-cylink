require('dotenv').config({
  path: `${__dirname}/../../.env${process.env.NODE_ENV === 'test' ? '.test' : ''}`,
});

const isProduction = process.env.NODE_ENV === 'production';

import type { Knex } from 'knex';

const config: Knex.Config = {
  client: process.env.DATABASE_DRIVER || 'pg',
  connection: process.env.DATABASE_URL,
  searchPath: process.env.DATABASE_SCHEMA?.split(',') || ['public'],
  migrations: {
    directory: __dirname + '/../database/scripts/migrations',
  },
  seeds: {
    directory: __dirname + '/../database/scripts/seeders',
  },
};

module.exports = config;
