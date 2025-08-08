# Bullhorn Auth Client Test

Example usage of the `bullhorn-auth-client` npm package for authenticating with Bullhorn API.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your Bullhorn credentials
```

3. Run the example:
```bash
npm run example
```

## Environment Variables

The package requires these environment variables (note the `BH_` prefix):

- `BH_CLIENT_ID` - Your Bullhorn OAuth client ID
- `BH_CLIENT_SECRET` - Your Bullhorn OAuth client secret  
- `BH_USERNAME` - Your Bullhorn username
- `BH_PASSWORD` - Your Bullhorn password

Alternatively, you can provide existing tokens:
- `BH_REST_URL` - Existing REST URL
- `BH_REST_TOKEN` - Existing REST token
- `BH_REFRESH_TOKEN` - Refresh token (optional)
- `BH_ACCESS_TOKEN` - Access token (optional)

## Files

- `example.js` - Minimal example showing authentication and basic API call
- `test.js` - Comprehensive test with multiple API endpoints
- `.env.example` - Template for environment variables

## Scripts

- `npm run example` - Run the simple example
- `npm run test` - Run comprehensive tests