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

### Getting Started

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

```bash
# Run database migrations
npm run db:migrate
```

### Database Seeding

The project includes seeders for initializing the database with essential data.

```bash
# Run all seeders
npm run db:seed

# Run specific seeder (admin user)
npm run db:seed:admin
```

Available seeders:

- `admin` - Creates an admin user with email `admin@cylink.id` and password `Admin@Cylink123`
