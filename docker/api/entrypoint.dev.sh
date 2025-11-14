#!/bin/sh
set -e

echo "🔄 Waiting for database to be ready..."

# Wait for database to be ready
until node -e "const { Pool } = require('pg'); const pool = new Pool({ connectionString: process.env.DATABASE_URL.replace('@database:', '@database:') }); pool.query('SELECT 1').then(() => { console.log('Database is ready!'); pool.end(); process.exit(0); }).catch(err => { console.error('Database not ready:', err.message); pool.end(); process.exit(1); });" 2>/dev/null; do
  echo "⏳ Database is unavailable - sleeping"
  sleep 2
done

echo "✅ Database is ready!"

echo "🔄 Creating database schema if not exists..."
node -e "
const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL.replace('@database:', '@database:')
});

const schema = process.env.DATABASE_SCHEMA || 'public';

async function createSchema() {
  try {
    await pool.query(\`CREATE SCHEMA IF NOT EXISTS \${schema}\`);
    console.log('✅ Schema \"' + schema + '\" is ready!');
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating schema:', err.message);
    await pool.end();
    process.exit(1);
  }
}

createSchema();
"

if [ $? -ne 0 ]; then
  echo "❌ Schema creation failed!"
  exit 1
fi

echo "🔄 Running database migrations..."
npm run db:migrate

if [ $? -eq 0 ]; then
  echo "✅ Migrations completed successfully!"
else
  echo "❌ Migration failed!"
  exit 1
fi

echo "🚀 Starting application..."
exec "$@"

