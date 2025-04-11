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
