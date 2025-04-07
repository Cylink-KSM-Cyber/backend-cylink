// const pool = require('@/config/database');
// const { generateQuery } = require('@/utils/query');
const { hash } = require('@/utils/crypto');

const seeders: any = {
  users: {
    columns: ['email', 'password', 'role'],
    values: [
      ['admin@localhost', 'securepassword123', 'admin'],
    ],
  },
};

const hashPasswords = async (seeders: any) => {
  for (const name in seeders) {
    for (const values of seeders[name].values) {
      const passwordIndex = seeders[name].columns.indexOf('password');
      if (passwordIndex !== -1) {
        values[passwordIndex] = await hash(values[passwordIndex]);
      }
    }
  }
};

const generateInsertQuery = (columns: Array<string>, values: Array<Array<string>>) => {
  let query = `INSERT INTO ${name} (${columns.join(', ')})\nVALUES\n`;

  values.forEach((values: any) => {
    query += `(${values.join(', ')}),\n`;
  });

  query += ';';
};

const generateSeederQuery = (seeders: any): string => {
  let query = '';

  for (const name in seeders) {
    query += `INSERT INTO ${name} (${seeders[name].columns.join(', ')})\nVALUES\n`;

    seeders[name].values.forEach((values: any) => {
      query += `(${values.join(', ')}),\n`;
    });

    query += ';';
  }

  return query;
};

(async () => {
  await hashPasswords(seeders);
  console.info(generateSeederQuery(seeders));
})();
