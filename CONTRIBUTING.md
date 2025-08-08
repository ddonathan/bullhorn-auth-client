# Contributing to bullhorn-auth-client

First off, thank you for considering contributing to bullhorn-auth-client! It's people like you that make this library better for everyone.

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please be respectful and professional in all interactions.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When you create a bug report, please include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples to demonstrate the steps**
- **Describe the behavior you observed and what you expected**
- **Include your Node.js version and operating system**
- **Include any relevant error messages or logs**

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

- **Use a clear and descriptive title**
- **Provide a detailed description of the suggested enhancement**
- **Provide specific examples to demonstrate how it would work**
- **Describe the current behavior and why the enhancement would be useful**
- **List any alternative solutions you've considered**

### Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. If you've changed APIs, update the documentation
4. Ensure the test suite passes (`npm test`)
5. Make sure your code lints (`npm run lint`)
6. Update the CHANGELOG.md with your changes
7. Submit your pull request!

## Development Setup

1. **Clone your fork:**
   ```bash
   git clone https://github.com/your-username/bullhorn-auth-client.git
   cd bullhorn-auth-client
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create a `.env` file for testing (optional):**
   ```bash
   cp .env.example .env
   # Edit .env with your Bullhorn credentials
   ```

4. **Run tests:**
   ```bash
   npm test                 # Run tests once
   npm run test:watch       # Run tests in watch mode
   npm run test:coverage    # Run tests with coverage report
   ```

5. **Lint your code:**
   ```bash
   npm run lint            # Check for linting errors
   npm run lint:fix        # Fix auto-fixable linting errors
   ```

## Project Structure

```
bullhorn-auth-client/
├── index.js          # Main library code
├── index.mjs         # ESM wrapper
├── index.d.ts        # TypeScript definitions
├── index.test.js     # Test suite
├── example/          # Example usage
│   └── example.js
├── README.md         # User documentation
├── CHANGELOG.md      # Version history
└── CONTRIBUTING.md   # This file
```

## Coding Standards

- **Code Style**: We use ESLint for code consistency. Run `npm run lint` before committing.
- **Comments**: Use JSDoc comments for all public functions
- **Error Handling**: Always provide meaningful error messages with context
- **Security**: Never log or expose sensitive information (tokens, passwords, etc.)
- **Testing**: Aim for >80% test coverage for new code

## Testing Guidelines

- Write unit tests for all new functionality
- Test both success and error paths
- Mock external HTTP requests (don't make real API calls in tests)
- Use descriptive test names that explain what is being tested
- Group related tests using `describe` blocks

Example test structure:
```javascript
describe('loginToBullhorn', () => {
  describe('with existing tokens', () => {
    it('should return existing tokens when ping succeeds and threshold is met', async () => {
      // Test implementation
    });
    
    it('should re-authenticate when threshold is not met', async () => {
      // Test implementation
    });
  });
});
```

## Commit Message Guidelines

We follow conventional commits for clear history:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, semicolons, etc.)
- `refactor:` Code refactoring without changing functionality
- `test:` Adding or updating tests
- `chore:` Maintenance tasks, dependency updates, etc.

Examples:
- `feat: add support for custom timeout configuration`
- `fix: correct password encoding in step1 function`
- `docs: add troubleshooting section to README`

## Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md` with release notes
3. Create a pull request with version bump
4. After merge, create a GitHub release
5. The CI/CD pipeline will automatically publish to npm

## Questions?

Feel free to open an issue for any questions about contributing. We're here to help!

## License

By contributing, you agree that your contributions will be licensed under the MIT License.