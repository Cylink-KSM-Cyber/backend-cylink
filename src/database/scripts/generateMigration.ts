import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import { format } from 'date-fns';

/*
 * CLI utility to scaffold new Knex migration files in a consistent manner.
 *
 * 1. Prompts developer for migration type (create table / alter table).
 * 2. Prompts for additional data (table name or alteration purpose).
 * 3. Generates appropriate filename and a boiler-plate migration template.
 *
 *   - Create table:  "xxx_<table_name>.ts" where xxx is an auto-incrementing
 *     3-digit identifier based on existing migrations.
 *   - Alter table:   "yyyymmddHHMMss_<purpose>_table.ts" where the prefix is
 *     a timestamp in the specified format.
 */

const LOCK_PATH = path.join(__dirname, '.migration.lock');

async function withLock(fn: () => Promise<void>): Promise<void> {
  fs.writeFileSync(LOCK_PATH, 'locked');
  try {
    await fn();
  } finally {
    fs.unlinkSync(LOCK_PATH);
  }
}

async function main(): Promise<void> {
  const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

  const { action } = await inquirer.prompt<{ action: 'create' | 'alter' }>([
    {
      type: 'list',
      name: 'action',
      message: 'Apakah Anda ingin membuat table baru atau alter table?',
      choices: [
        { name: 'Buat table baru', value: 'create' },
        { name: 'Alter table', value: 'alter' },
      ],
    },
  ]);

  if (action === 'create') {
    await withLock(() => handleCreateTable(MIGRATIONS_DIR));
  } else {
    await withLock(() => handleAlterTable(MIGRATIONS_DIR));
  }
}

async function handleCreateTable(dir: string): Promise<void> {
  const { tableName } = await inquirer.prompt<{ tableName: string }>([
    {
      type: 'input',
      name: 'tableName',
      message: 'Masukkan nama tabel:',
      validate: (v: string) => v.trim() !== '' || 'Nama tabel tidak boleh kosong',
    },
  ]);

  // Compute next incremental id (3-digit)
  const files = fs.readdirSync(dir);
  const ids = files
    .map((f: string) => /^(\d{3})_/.exec(f))
    .filter((m: RegExpExecArray | null): m is RegExpExecArray => Boolean(m))
    .map((m: RegExpExecArray) => parseInt(m[1], 10));

  const nextId = (Math.max(0, ...ids) + 1).toString().padStart(3, '0');
  const fileName = `${nextId}_${tableName}.ts`;
  const filePath = path.join(dir, fileName);

  const template = generateCreateTemplate(tableName);
  fs.writeFileSync(filePath, template);
  console.log(`Migration file created: ${filePath}`);
}

async function handleAlterTable(dir: string): Promise<void> {
  const { purpose } = await inquirer.prompt<{ purpose: string }>([
    {
      type: 'input',
      name: 'purpose',
      message: 'Deskripsikan tujuan alter (snake_case):',
      validate: (v: string) => v.trim() !== '' || 'Tujuan alter tidak boleh kosong',
    },
  ]);

  const timestamp = format(new Date(), 'yyyyMMddHHmmss');
  const fileName = `${timestamp}_${purpose}_table.ts`;
  const filePath = path.join(dir, fileName);

  const template = generateAlterTemplate(purpose);
  fs.writeFileSync(filePath, template);
  console.log(`Migration file created: ${filePath}`);
}

function generateCreateTemplate(table: string): string {
  return `import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('${table}', (table) => {
    table.increments('id').primary();
    // tambahkan kolom lain di sini
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('${table}');
}
`;
}

function generateAlterTemplate(purpose: string): string {
  return `import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // TODO: implement alter logic for: ${purpose}
}

export async function down(knex: Knex): Promise<void> {
  // TODO: revert alter logic for: ${purpose}
}
`;
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
