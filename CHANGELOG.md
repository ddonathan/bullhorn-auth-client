# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2025-01-08

### Added
- Comprehensive JSDoc comments for all functions
- Input validation for all authentication parameters
- Improved error handling with detailed error context
- Troubleshooting section in README
- Security considerations documentation
- Additional npm scripts: `lint:fix`, `test:watch`, `test:coverage`
- `dotenv` as optional peer dependency
- CONTRIBUTING.md with development guidelines

### Changed
- Enhanced error responses with more context (error messages, status text)
- Optimized response handling (removed unnecessary cloning)
- Improved retry callback error handling
- Updated documentation with Node.js version requirements

### Fixed
- Fixed password encoding function bug that always returned unencoded password
- Fixed ESLint warnings for unused variables
- Clarified Node.js 18+ requirement for native fetch support

### Security
- Added comprehensive input validation to prevent malformed requests
- Documented Bullhorn's non-standard OAuth flow requirements
- Enhanced security best practices documentation

## [1.0.1] - 2025-01-08

### Changed
- Improved CI/CD pipeline
- Added GitHub Packages publishing

### Fixed
- Minor documentation updates

## [1.0.0] - 2025-01-XX

### Added
- Initial release
- OAuth2 authentication flow for Bullhorn
- Token refresh capability
- REST session management
- Support for multiple authentication paths:
  - Existing token validation
  - Refresh token flow
  - Access token exchange
  - Full authentication flow
- TypeScript definitions
- Comprehensive test suite
- Environment variable helpers
- Exponential backoff retry logic
- Rate limit monitoring

[Unreleased]: https://github.com/DanielPollock/bullhorn-auth-client/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/DanielPollock/bullhorn-auth-client/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/DanielPollock/bullhorn-auth-client/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/DanielPollock/bullhorn-auth-client/releases/tag/v1.0.0