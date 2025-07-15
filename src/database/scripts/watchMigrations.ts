import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs';
import colors from 'ansi-colors';

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const LOCK_PATH = path.join(__dirname, '.migration.lock');

function isLocked(): boolean {
  return fs.existsSync(LOCK_PATH);
}

const emitted = new Set<string>();

const watcher = chokidar.watch(MIGRATIONS_DIR, {
  ignoreInitial: true,
});

watcher.on('add', (filePath) => {
  if (isLocked()) return; // event triggered by generator
  const rel = path.relative(process.cwd(), filePath);
  if (emitted.has(rel)) return; // already warned
  emitted.add(rel);
  // eslint-disable-next-line no-console
  console.error(
    colors.red.bold(`\n[WARNING] Detected manual migration file creation: ${rel}`),
    '\nPlease use "npm run migration:new" to generate migration files.\n',
  );
});

console.log(`[migration-watch] Watching ${MIGRATIONS_DIR} for unauthorized file creations...`);
