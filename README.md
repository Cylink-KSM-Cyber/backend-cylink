# Cylink Backend

A comprehensive URL shortener and QR code generator platform built with Express.js, featuring advanced analytics, conversion tracking, and enterprise-grade authentication.

## Project Structure

```
src/
├── __tests__/            # Test suite (Jest/Vitest)
├── collections/          # Data collections and types
├── config/               # Application configuration
│   └── logs/            # Logging configuration
├── controllers/          # Request handlers
│   ├── qr-code/         # QR code generation
│   └── urls/            # URL shortening
├── database/             # Database layer
│   ├── migrations/      # Schema migrations (deprecated)
│   ├── scripts/         # Database utilities
│   │   └── migrations/  # Active migration files
│   └── seeders/         # Database seed files
├── docs/                 # API documentation
├── interfaces/           # TypeScript interfaces
├── jobs/                 # Background jobs
├── mails/                # Email templates
├── middlewares/          # Express middlewares
├── models/               # Database models
├── routes/               # API route definitions
├── services/             # Business logic
├── utils/                # Helper utilities
└── validators/           # Request validation
```

## Features

### 🔗 **URL Shortening**

- **Custom Short Codes**: Create memorable, branded short URLs
- **Smart URL Management**: Title support, expiry dates, and active/inactive states
- **Password Protection**: Optional password-protected URLs
- **Redirect Types**: Configurable 301/302 redirect types
- **Anonymous URLs**: Create short URLs without authentication
- **Advanced Search**: Full-text search across URLs, titles, and short codes
- **Status Filtering**: Filter by active, inactive, expired, or expiring-soon URLs
- **Bulk Operations**: Manage multiple URLs efficiently

### 📊 **Analytics & Tracking**

- **Click Analytics**: Comprehensive click tracking with time-series data
- **Impression Tracking**: Monitor URL impressions for CTR analysis
- **Conversion Goals**: Define and track conversion events
- **Geographic Analytics**: Track clicks by location
- **Device Analytics**: Analyze user devices and browsers
- **Time-Based Reports**: Daily, weekly, and monthly aggregations
- **Comparison Analysis**: Compare metrics across different time periods
- **Real-Time Statistics**: Live click counters and analytics

### 📱 **QR Code Generation**

- **Dynamic QR Codes**: Generate QR codes linked to shortened URLs
- **Customizable Format**: Support for multiple image formats
- **Error Correction**: Built-in error correction levels
- **Soft Delete Support**: Safely remove QR codes without data loss
- **URL Integration**: Seamless integration with URL management

### 🔒 **Enterprise Authentication**

- **JWT Authentication**: Secure token-based authentication
- **Email Verification**: User email verification workflow
- **Password Reset**: Secure password recovery system
- **Token Refresh**: Automatic token refresh mechanism
- **Last Login Tracking**: Monitor user login history
- **Rate Limiting**: Protection against brute-force attacks

### 🌐 **Developer Experience**

- **Interactive API Documentation**: Swagger UI with basic authentication
- **Comprehensive Testing**: Jest/Vitest test suite with high coverage
- **Docker Support**: Complete Docker development environment
- **Hot Reload**: Automatic code reloading in development
- **Migration System**: Interactive migration generator with file watcher
- **Database Seeding**: Automated data seeding for development
- **Email Testing**: MailHog integration for email debugging
- **Type Safety**: Full TypeScript support

### 📧 **Email System**

- **Email Verification**: Automated verification email workflow
- **Password Reset Emails**: Secure password recovery emails
- **SMTP Integration**: Flexible SMTP configuration
- **Development Email Testing**: MailHog for local email debugging
- **Email Templates**: Professional, responsive email templates

### 🛡️ **Monitoring & Logging**

- **Sentry Integration**: Advanced error tracking and performance monitoring
- **Custom Logging**: Winston-based logging system with rotation
- **Health Checks**: Database health monitoring
- **Performance Profiling**: Sentry profiling integration
- **Environment-Based Sampling**: Configurable sampling rates per environment

### 🚀 **Performance & Reliability**

- **Database Optimization**: Advanced indexing with GIN and composite indexes
- **Full-Text Search**: PostgreSQL full-text search capabilities
- **Caching Layer**: Memory cache for improved performance
- **Connection Pooling**: Efficient database connection management
- **Graceful Shutdown**: Proper cleanup and connection closure

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL database (v12 or higher)
- npm or pnpm package manager
- Docker and Docker Compose (optional, for development)

## Installation

### Local Development Setup

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Set up environment variables:

```bash
cp .env.example .env
```

3. Update the `.env` file with your configuration:

```env
# Application Configuration
PORT=3000
NODE_ENV=development
HOST=http://localhost:3000

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/cylink
DATABASE_SSL=false
DATABASE_USER=cylink_user
DATABASE_PASSWORD=your_password
DATABASE_NAME=cylink
DATABASE_PORT=5432

# Security & Authentication
JWT_SECRET=your-super-secret-jwt-key
ACCESS_TOKEN_SECRET=your-access-token-secret
REFRESH_TOKEN_SECRET=your-refresh-token-secret
VERIFICATION_TOKEN_SECRET=your-verification-token-secret
SHORT_URL_BASE=http://localhost:3000

# Email Configuration
ENABLE_EMAIL_VERIFICATION=false
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASSWORD=
MAILER_SENDER=noreply@cylink.id

# API Documentation
DOCS_USERNAME=admin
DOCS_PASSWORD=your-secure-password
```

4. Run database migrations:

```bash
npm run db:migrate
```

5. Seed the database (optional):

```bash
npm run db:seed:admin    # Create admin user
npm run db:seed:all      # Seed all data
```

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

#### Common Docker Commands

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

## Running the Application

```bash
# Development mode with hot reload and migration watcher
npm run dev

# Build for production
npm run build

# Run in production mode
npm start
```

The application will be available at `http://localhost:3000` (or your configured PORT)

## Database Migration

> **Migration workflow update (2024)**
> Migrations are now managed via an interactive generator plus a live watcher.
>
> 1. Run `npm run dev` – this starts both the REST API (via `nodemon`) **and** a file-system watcher that monitors `src/database/scripts/migrations/`.
> 2. When you need a new migration **always** execute:
>
>    ```bash
>    npm run migration:new
>    ```
>
>    - Choose between _create table_ or _alter table_.
>    - The script generates the correctly named file (`NNN_<table>.ts` or `YYYYMMDDHHmmss_<purpose>_table.ts`).
>
> 3. If you attempt to create a file manually in that folder while the watcher is running, the terminal will print a red warning:
>
>    `Please use "npm run migration:new" to generate migration files.`
>
>    The file will still be created (in case of emergency edits), but you are urged to delete it and rerun the generator.
>
> 4. Normal Knex commands (`npm run db:migrate`, etc.) work unchanged.

### Migration Commands

```bash
# Run database migrations
npm run db:migrate

# Check migration status
npm run db:migrate:status

# Rollback the last migration
npm run db:migrate:rollback

# Create a new migration (legacy - use migration:new instead)
npm run db:migrate:make <migration_name>

# Generate new migration interactively (recommended)
npm run migration:new
```

### Migration Files

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
- `20250712124317_fix_short_code_length.ts` - Short code length optimization
- `20250712131315_add_unique_constraint_url_conversion_goals.ts` - Unique constraints
- `20250722144553_add_last_login_and_user_logins_table.ts` - Login tracking

### Database Seeding

The project includes seeders for initializing the database with essential data and sample data for testing.

```bash
# Run all seeders
npm run db:seed

# Run specific seeders
npm run db:seed:admin        # Creates admin user
npm run db:seed:urls         # Creates sample URLs
npm run db:seed:qrcodes      # Creates sample QR codes
npm run db:seed:clicks       # Creates sample click analytics
npm run db:seed:impressions  # Creates sample impression data
npm run db:seed:goals        # Creates conversion goals
npm run db:seed:conversions  # Creates conversion events

# Run all seeders sequentially in correct order
npm run db:seed:all
```

**Default Admin Credentials:**

- Email: `admin@cylink.id`
- Password: `Admin@Cylink123`

Note: Seeders should be run in the correct order as some depend on data created by others:

1. admin
2. urls
3. qrcodes
4. clicks
5. impressions
6. goals
7. conversions

## API Endpoints

For complete API documentation, visit the Swagger UI at `http://localhost:3000/api/docs` when running the application.

### Authentication

- `POST /api/v1/auth/register` - Register a new user
- `POST /api/v1/auth/login` - Login to get access token
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/verify-email` - Verify user email
- `POST /api/v1/auth/resend-verification` - Resend verification email
- `POST /api/v1/auth/forgot-password` - Request password reset
- `POST /api/v1/auth/reset-password` - Reset password with token

### URLs (Authenticated)

- `GET /api/v1/urls` - Get all user's URLs with filtering and search
  - Query params: `status`, `search`, `page`, `limit`, `sortBy`, `sortOrder`
- `POST /api/v1/urls` - Create a new shortened URL
- `GET /api/v1/urls/:id` - Get a specific URL by ID
- `PUT /api/v1/urls/:id` - Update a URL
- `DELETE /api/v1/urls/:id` - Delete a URL (soft delete)
- `GET /api/v1/urls/:id/qr-code` - Get QR code for a URL
- `GET /api/v1/urls/:id/analytics` - Get analytics for a specific URL
- `GET /api/v1/urls/total-clicks` - Get aggregated click analytics
  - Query params: `start_date`, `end_date`, `comparison`, `group_by`

### Public URLs (No Authentication)

- `POST /api/v1/public/urls` - Create an anonymous shortened URL
- `GET /api/v1/public/urls/:short_code` - Get URL details by short code
- `GET /:short_code` - Resolve and redirect to original URL

### QR Codes

- `POST /api/v1/qr-codes` - Generate a new QR code
- `GET /api/v1/qr-codes/:id` - Get a specific QR code by ID
- `DELETE /api/v1/qr-codes/:id` - Delete a QR code (soft delete)

### Conversion Tracking

- `POST /api/v1/conversion-goals` - Create a conversion goal
- `GET /api/v1/conversion-goals` - Get all conversion goals
- `GET /api/v1/conversion-goals/:id` - Get a specific conversion goal
- `PUT /api/v1/conversion-goals/:id` - Update a conversion goal
- `DELETE /api/v1/conversion-goals/:id` - Delete a conversion goal
- `POST /api/v1/conversions/track` - Track a conversion event

### CTR (Click-Through Rate)

- `POST /api/v1/impressions/track` - Track an impression
- `GET /api/v1/impressions/:url_id` - Get impression data for a URL
- `GET /api/v1/impressions/:url_id/ctr` - Calculate CTR for a URL

### User Profile

- `GET /api/v1/profile` - Get user profile
- `PUT /api/v1/profile` - Update user profile
- `PUT /api/v1/profile/password` - Change password

## Testing

This project uses Jest for comprehensive unit testing with high coverage across controllers, utilities, and middleware components.

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Test Coverage

Test coverage reports are generated using Jest's built-in coverage reporter. A detailed HTML report is available in the `/coverage` directory after running tests.

### Test Structure

```
src/
├── __tests__/              # All test files
│   ├── setup.ts            # Global test setup
│   ├── controllers/        # Controller tests
│   │   ├── urlController.test.ts
│   │   └── qrCodeController.test.ts
│   ├── utils/              # Utility tests
│   │   ├── testUtils.ts
│   │   ├── authTestUtils.ts
│   │   ├── modelTestUtils.ts
│   │   └── shortCode.test.ts
│   ├── middlewares/        # Middleware tests
│   ├── services/           # Service tests
│   └── validators/         # Validation tests
```

## Code Quality

### Linting and Formatting

This project uses ESLint and Prettier to maintain code quality and consistency.

```bash
# Check for linting errors
npm run lint

# Fix linting errors automatically
npm run lint:fix
```

### VS Code Integration

For the best development experience with VS Code, install the following extensions:

1. ESLint (dbaeumer.vscode-eslint)
2. Prettier (esbenp.prettier-vscode)

Then add these settings to your VS Code `settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## Monitoring & Error Tracking

### Sentry Integration

The application includes comprehensive Sentry integration for error tracking and performance monitoring.

**Environment Variables:**

```env
# Sentry DSN
SENTRY_DSN=your-sentry-dsn

# Sampling Rates (Optional - defaults per environment)
# Development: 100% (1.0), Staging: 50% (0.5), Production: 10% (0.1)
SENTRY_TRACES_SAMPLE_RATE=1.0
SENTRY_PROFILE_SAMPLE_RATE=1.0

# Privacy Configuration
SENTRY_SEND_DEFAULT_PII=false

# Release Tracking
SENTRY_RELEASE=backend-cylink@1.2.0
SENTRY_ENVIRONMENT=development
```

**Features:**

- Automatic error tracking
- Performance monitoring with custom sampling rates
- Source map support for production debugging
- Release tracking and deployment monitoring
- Profiling integration

### Logging

The application uses Winston for structured logging with file rotation.

Logs are stored in the `/logs` directory:

- `combined.log` - All logs
- `error.log` - Error logs only

## Technologies Used

- **Express.js** - Fast, unopinionated web framework
- **TypeScript** - Type-safe JavaScript
- **PostgreSQL** - Advanced relational database
- **Knex.js** - SQL query builder and migration tool
- **JWT** - JSON Web Token authentication
- **Bcrypt** - Password hashing
- **QRCode** - QR code generation
- **Nodemailer** - Email sending
- **Mailtrap** - Email testing platform
- **Swagger** - API documentation
- **Sentry** - Error tracking and performance monitoring
- **Winston** - Logging framework
- **Jest/Vitest** - Testing framework
- **Docker** - Containerization

## API Documentation

The API documentation is available via Swagger UI and provides:

- ✅ **Interactive API Testing** - Test all endpoints directly in the browser
- ✅ **Complete Endpoint Documentation** - All CRUD and custom endpoints
- ✅ **Request/Response Examples** - Clear examples for each endpoint
- ✅ **Authentication Support** - Built-in JWT Bearer token integration
- ✅ **Basic Authentication** - Protected documentation access
- ✅ **Error Documentation** - Detailed error codes and meanings

### Accessing the Documentation

**Development**: `http://localhost:3000/api/docs`
**Production**: `https://cylink.id/api/docs`

**Default Credentials:**

- Username: `admin`
- Password: Set via `DOCS_PASSWORD` environment variable

### Using the Documentation

1. **Authenticate**: Click the "Authorize" button and enter your JWT token
2. **Test Endpoints**: Expand any endpoint and click "Try it out"
3. **View Examples**: See request/response examples for each endpoint
4. **Understand Errors**: Review error codes and their meanings

## Troubleshooting

### Docker Development Issues

**Port Already in Use:**

```bash
# Check what's using the port
sudo lsof -i :5000

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

### Common Issues

**Migration Errors:**

- Ensure database is running and accessible
- Check database credentials in `.env`
- Verify migration files are in correct format

**Email Not Sending:**

- Check SMTP configuration
- In development, verify MailHog is running
- Check email logs in application logs

**Authentication Errors:**

- Verify JWT secrets are set in `.env`
- Check token expiration settings
- Ensure user email is verified (if enabled)

## Changelog

### Version 1.2.0 (Latest) - Enhanced Monitoring & Development Environment

**Release Date:** November 22, 2024

**Major Features:**

- 🆕 **Sentry Integration**: Advanced error tracking and performance monitoring
- 🆕 **Enhanced Docker Development**: Complete Docker-based development environment with MailHog
- 🆕 **API Documentation Security**: Basic authentication for Swagger documentation
- 🆕 **Improved Email Configuration**: Optional SMTP authentication support

**Development Experience:**

- ✅ **Docker Compose Development**: Full local development stack with PostgreSQL and MailHog
- ✅ **Hot Reload**: Automatic code reloading with nodemon and migration watcher
- ✅ **Email Testing**: MailHog integration for local email debugging
- ✅ **Database Health Checks**: Ensure proper service startup order

**Monitoring & Logging:**

- ✅ **Sentry Error Tracking**: Automatic error capture and reporting
- ✅ **Performance Monitoring**: Transaction and profiling support
- ✅ **Custom Sampling Rates**: Environment-based sampling configuration
- ✅ **Source Maps**: Production debugging with source map uploads
- ✅ **Enhanced Logging**: Winston-based logging with file rotation

**Security Improvements:**

- ✅ **Protected Documentation**: Basic authentication for API docs
- ✅ **Environment-Based Config**: Separate configurations for dev/staging/production
- ✅ **Flexible Email Auth**: Support for SMTP with or without authentication

**Technical Enhancements:**

- ✅ **Updated Dependencies**: Latest Sentry SDK and Node libraries
- ✅ **Improved Configuration**: Better environment variable management
- ✅ **Docker Optimization**: Multi-stage builds and health checks
- ✅ **Documentation Updates**: Comprehensive README with Docker instructions

### Version 1.1.0 - User Login Tracking & Enhanced Analytics

**Major Features:**

- 🆕 **Last Login Tracking**: Monitor user login activity
- 🆕 **User Login History**: Dedicated table for login event tracking
- 🆕 **Enhanced Login Response**: Improved login response structure with user details

**API Improvements:**

- ✅ **User Login Data**: Comprehensive user information in login responses
- ✅ **Token Information**: Detailed token metadata in authentication responses
- ✅ **Login Analytics**: Track and analyze user login patterns

**Database Updates:**

- ✅ **user_logins Table**: New table for login event tracking
- ✅ **last_login Column**: Track most recent login timestamp
- ✅ **Migration Support**: Seamless schema updates

### Version 1.0.0 - Initial Release

**Core Features:**

- ✅ URL shortening with custom short codes
- ✅ QR code generation
- ✅ Click and impression tracking
- ✅ Conversion goal tracking
- ✅ User authentication with JWT
- ✅ Email verification
- ✅ Password reset functionality
- ✅ Swagger API documentation
- ✅ PostgreSQL database with Knex.js
- ✅ Comprehensive test suite
- ✅ Rate limiting and security features

**Technical Implementation:**

- ✅ Express.js application structure
- ✅ TypeScript for type safety
- ✅ Advanced database indexing
- ✅ Full-text search capabilities
- ✅ Migration system
- ✅ Database seeding

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Convention

We follow conventional commits:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `chore:` - Maintenance tasks
- `refactor:` - Code refactoring
- `test:` - Test updates

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:

- Create an issue on GitHub
- Email: admin@cylink.id

## Authors

**KSM Cyber Team**

---

**Built with ❤️ by KSM Cyber**
