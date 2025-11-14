# Test Cylink

Cylink URL Shortener and QR Generator

## Testing

This project uses Jest for unit testing. The test suite covers controllers, utilities, and middleware components.

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Test Structure

Tests are organized according to the following structure:

```
src/
├── __tests__/              # All test files
│   ├── setup.ts            # Global test setup
│   ├── example.test.ts     # Basic test example
│   ├── controllers/        # Controller tests
│   │   ├── README.md       # Controller test documentation
│   │   └── urlController.test.ts
│   ├── utils/              # Utility tests
│   │   ├── README.md       # Test utilities documentation
│   │   ├── authTestUtils.ts
│   │   ├── modelTestUtils.ts
│   │   ├── testUtils.ts
│   │   └── shortCode.test.ts
│   ├── middlewares/        # Middleware tests
│   └── ...
```

### Key Test Files

- `src/__tests__/controllers/urlController.test.ts`: Tests for URL-related endpoints
- `src/__tests__/utils/shortCode.test.ts`: Tests for URL shortening utilities
- `src/__tests__/utils/testUtils.ts`: Helper functions for testing Express apps
- `src/__tests__/utils/authTestUtils.ts`: Authentication testing utilities
- `src/__tests__/utils/modelTestUtils.ts`: Data factories for model testing

### Coverage

Test coverage reports are generated using Jest's built-in coverage reporter.

To view coverage details, run:

```bash
npm run test:coverage
```

A coverage report will be generated in the console and a detailed HTML report will be available in the `/coverage` directory.

## Development

### Docker Development Environment (Recommended)

The project includes a complete Docker-based development environment with hot reload, local PostgreSQL database, and MailHog for email testing.

#### Prerequisites

- Docker and Docker Compose installed
- For WSL2 users: Ensure WSL2 is properly configured

#### Quick Start

1. **Copy environment file:**

   ```bash
   cp .env.example .env.dev
   ```

2. **Configure `.env.dev`:**
   The file is pre-configured with development defaults. Key settings:

   - Database: Local PostgreSQL in Docker (no need for external database)
   - SMTP: MailHog (catches all emails for testing)
   - Port: 5000

3. **Start development environment:**

   ```bash
   docker compose -f docker-compose.dev.yml --env-file .env.dev up -d --build
   ```

4. **Access services:**
   - **API**: http://localhost:5000
   - **API Documentation (Swagger)**: http://localhost:5000/api/docs
     - Username: `admin`
     - Password: `cylink-dev-docs-2024`
   - **MailHog UI**: http://localhost:8025 (view all sent emails)
   - **Database**: localhost:5433
     - User: `cylink_user`
     - Password: `cylink_password`
     - Database: `cylink_dev`

#### Development Features

- ✅ **Hot Reload**: Code changes are detected automatically via nodemon
- ✅ **Auto Migrations**: Database schema is created and migrated automatically on startup
- ✅ **Email Testing**: All emails are captured by MailHog (no external SMTP needed)
- ✅ **Local Database**: PostgreSQL runs in Docker (no cloud database required)
- ✅ **Health Checks**: Database health checks ensure proper startup order

#### Common Commands

```bash
# Start development environment
docker compose -f docker-compose.dev.yml --env-file .env.dev up -d

# Stop development environment
docker compose -f docker-compose.dev.yml --env-file .env.dev down

# View logs (all services)
docker compose -f docker-compose.dev.yml --env-file .env.dev logs -f

# View logs (specific service)
docker compose -f docker-compose.dev.yml --env-file .env.dev logs -f api

# Restart a service
docker compose -f docker-compose.dev.yml --env-file .env.dev restart api

# Rebuild and restart
docker compose -f docker-compose.dev.yml --env-file .env.dev up -d --build

# Execute command in container
docker compose -f docker-compose.dev.yml --env-file .env.dev exec api npm run db:migrate

# Access database shell
docker compose -f docker-compose.dev.yml --env-file .env.dev exec database psql -U cylink_user -d cylink_dev
```

#### Troubleshooting

**Port Already in Use:**

```bash
# Check what's using the port
sudo lsof -i :5000
# or
netstat -tlnp | grep 5000

# Stop all containers and restart
docker compose -f docker-compose.dev.yml --env-file .env.dev down
docker compose -f docker-compose.dev.yml --env-file .env.dev up -d --build
```

**Database Connection Issues:**

```bash
# Check database health
docker compose -f docker-compose.dev.yml --env-file .env.dev ps

# Reset database (WARNING: This will delete all data)
docker compose -f docker-compose.dev.yml --env-file .env.dev down -v
docker compose -f docker-compose.dev.yml --env-file .env.dev up -d --build
```

**WSL2 Users - Cannot Access from Windows Browser:**

If running on WSL2 and cannot access `http://localhost:5000` from Windows:

1. Get WSL2 IP address:

   ```bash
   hostname -I
   ```

2. Access using WSL2 IP (e.g., `http://172.29.207.112:5000`)

For permanent solution, create `.wslconfig` in Windows:

```ini
# Location: C:\Users\<YourUsername>\.wslconfig
[wsl2]
networkingMode=mirrored
localhostForwarding=true
```

Then restart WSL2:

```powershell
# In Windows PowerShell (Administrator)
wsl --shutdown
```

### Local Development (Without Docker)

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run in production mode
npm start
```

### Linting and Code Formatting

This project uses ESLint and Prettier to maintain code quality and consistency.

```bash
# Check for linting errors
npm run lint

# Fix linting errors automatically (when possible)
npm run lint:fix

# Check for linting errors but allow all warnings
npm run lint -- --max-warnings=9999
```

The linting rules are configured to be helpful without being overly restrictive:

- Warnings for the use of `any` type to encourage better type safety
- Import ordering to maintain consistent code organization
- Code style consistency with Prettier integration
- CommonJS support for backend Node.js compatibility

#### VS Code Integration

For the best development experience with VS Code, install the following extensions:

1. ESLint (dbaeumer.vscode-eslint)
2. Prettier (esbenp.prettier-vscode)

Then add these settings to your VS Code settings.json:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

This will automatically format your code and fix ESLint errors on save.

### Environment Variables

Copy `.env.example` to `.env` and configure your environment variables:

```
PORT=3000
NODE_ENV=development
...
```

### Database Migration

> **Migration workflow update (July 2025)**  
> Migrations are now managed via an interactive generator plus a live watcher.
>
> 1. Run `npm run dev` – this starts both the REST API (via `nodemon`) **and** a file-system watcher that monitors `src/database/scripts/migrations/`.
> 2. When you need a new migration **always** execute:
>
>    ```bash
>    npm run migration:new
>    ```
>
>    • Choose between _create table_ or _alter table_.
>    • The script generates the correctly named file (`NNN_<table>.ts` or `YYYYMMDDHHmmss_<purpose>_table.ts`).
>
> 3. If you attempt to create a file manually in that folder while the watcher is running, the terminal will print a red warning:
>
>    `Please use "npm run migration:new" to generate migration files.`
>
>    The file will still be created (in case of emergency edits), but you are urged to delete it and rerun the generator.
>
> 4. Normal Knex commands (`npm run db:migrate`, etc.) work unchanged.

This project uses Knex.js for database migrations. The migration system provides a structured approach to database schema changes.

```bash
# Run database migrations
npm run db:migrate

# Check migration status
npm run db:migrate:status

# Rollback the last migration
npm run db:migrate:rollback

# Create a new migration
npm run db:migrate:make <migration_name>
```

#### Migration Files

Migration files are located in `/src/database/scripts/migrations/` and follow a structured naming convention:

- `001_users.ts` - User table and authentication
- `002_urls.ts` - URL shortening core tables
- `003_clicks.ts` - Click tracking analytics
- `004_impressions.ts` - Impression tracking for CTR
- `005_qr_codes.ts` - QR code generation tables
- `006_conversion_goals.ts` - Conversion tracking goals
- `007_url_conversion_goals.ts` - URL-to-goal associations
- `008_conversions.ts` - Conversion event tracking
- `009_add_password_reset_columns.ts` - Password reset functionality
- `010_add_search_indexes.ts` - Search performance optimization

#### Creating New Migrations

When creating new migrations, follow these best practices:

1. **Use descriptive names**: `npm run db:migrate:make` is retained only for _legacy_ or emergency scenarios (e.g., quick hotfixes in CI). Prefer `npm run migration:new` during normal development.
2. **Include both up and down functions**: Ensure migrations are reversible
3. **Test thoroughly**: Run migration and rollback in development
4. **Document changes**: Add comments explaining complex schema changes

Example migration structure:

```typescript
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('table_name', table => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('table_name');
}
```

### Database Seeding

The project includes seeders for initializing the database with essential data and sample data for testing.

```bash
# Run all seeders
npm run db:seed

# Run specific seeders
npm run db:seed:admin    # Creates admin user
npm run db:seed:urls     # Creates sample URLs
npm run db:seed:qrcodes  # Creates sample QR codes
npm run db:seed:clicks   # Creates sample click analytics data

# Run all seeders sequentially in correct order
npm run db:seed:all
```

Available seeders:

- `admin` - Creates an admin user with email `admin@cylink.id` and password `Admin@Cylink123`
- `urls` - Creates 100 sample URLs with various configurations
- `qrcodes` - Creates QR codes for approximately 80% of the URLs
- `clicks` - Creates 150 sample click analytics records

Note: Seeders should be run in the correct order as some depend on data created by others:

1. admin
2. urls
3. qrcodes
4. clicks
