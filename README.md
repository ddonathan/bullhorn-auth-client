### bullhorn-auth-client

Lightweight Node.js client to obtain a Bullhorn REST session (BhRestToken) efficiently. No external HTTP dependencies.

- Accepts either:
  - Existing `restUrl` + `restToken` (pings and returns if still valid), optionally `refreshToken`.
  - `refreshToken` plus client credentials (`clientId`, `clientSecret`, `username`) to refresh.
  - Full credentials (`clientId`, `clientSecret`, `username`, `password`) for a full auth flow.
  - Access token shortcut: `accessToken` (+ `restUrl` or `credentials.username` to derive) to jump straight to REST login.
- Returns `restUrl`, `restToken`, and when available `refreshToken`, `accessToken`, and `minRemaining`.

#### Requirements

- **Node.js 18+** (uses the native `fetch` API)
  - Node.js 17.5+ has experimental fetch support
  - Node.js 18+ has stable fetch support
  - For older Node versions, you'll need to polyfill fetch (e.g., `node-fetch`)
- **Optional**: `dotenv` package for loading environment variables from `.env` files

#### Install

```bash
npm install bullhorn-auth-client
```

#### Usage (CJS)

```js
const { loginToBullhorn } = require('bullhorn-auth-client');

// 1) Using existing REST token
await loginToBullhorn({
  tokens: { restUrl: 'https://rest...', restToken: 'BhRestToken...' }
}, { minRemainingThreshold: 100 });

// 2) Using refresh token
await loginToBullhorn({
  credentials: {
    clientId: process.env.BH_CLIENT_ID,
    clientSecret: process.env.BH_CLIENT_SECRET,
    username: process.env.BH_USERNAME,
    password: process.env.BH_PASSWORD
  },
  tokens: { refreshToken: '...' }
});

// 3) Full login
await loginToBullhorn({
  credentials: {
    clientId: process.env.BH_CLIENT_ID,
    clientSecret: process.env.BH_CLIENT_SECRET,
    username: process.env.BH_USERNAME,
    password: process.env.BH_PASSWORD
  }
});

// 4) Access token shortcut
await loginToBullhorn({
  tokens: { accessToken: '...', restUrl: 'https://rest...' }
});
```

#### Usage with .env (recommended)

Load a `.env` file and let the helpers read values from environment variables.

**Note**: The `dotenv` package is an optional peer dependency. Install it if you want to use `.env` files:

```bash
npm install dotenv
```

```js
// ESM
import 'dotenv/config';
import { loginToBullhorn, credentialsFromEnv, tokensFromEnv } from 'bullhorn-auth-client';

const credentials = credentialsFromEnv() ?? undefined;
const tokens = tokensFromEnv();

const result = await loginToBullhorn({ credentials, tokens });
```

```js
// CJS
require('dotenv').config();
const { loginToBullhorn, credentialsFromEnv, tokensFromEnv } = require('bullhorn-auth-client');

(async () => {
  const credentials = credentialsFromEnv() || undefined;
  const tokens = tokensFromEnv();
  const result = await loginToBullhorn({ credentials, tokens });
  console.log(result);
})();
```

#### Usage (ESM)

```js
import { loginToBullhorn } from 'bullhorn-auth-client';
```

#### API

```ts
type BullhornCredentials = {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
};

type TokenInput = {
  restUrl?: string;
  restToken?: string;
  refreshToken?: string;
  accessToken?: string;
};

type AuthConfig = {
  ttlDays?: number; // default 30
  minRemainingThreshold?: number; // default env THRESHOLD_REMAINING_MIN or 100
  http?: {
    retries?: number; // default 0 (retries 429/5xx)
    timeoutMs?: number; // default 30000
    userAgent?: string; // default "bullhorn-auth-client"
    onRetryAttempt?: (info: { attempt: number; status?: number }) => void;
  };
};

type AuthResult = {
  restUrl: string;
  restToken: string;
  refreshToken?: string;
  accessToken?: string;
  minRemaining?: string;
  method: 'existing' | 'refresh' | 'full' | 'access';
};

declare function loginToBullhorn(
  params: { credentials?: BullhornCredentials; tokens?: TokenInput },
  config?: AuthConfig
): Promise<AuthResult>;

declare function credentialsFromEnv(env?: NodeJS.ProcessEnv): BullhornCredentials | null;
declare function tokensFromEnv(env?: NodeJS.ProcessEnv): Partial<TokenInput>;
```

#### Flow details (non-interactive)
- `loginInfo`: fetches `oauthUrl`/`restUrl` given a username.
- `authorize`: GET with `action=Login&username&password`, manual redirect; parse `code` from Location header.
- `token`: exchange `code` for `access_token` and `refresh_token`.
- `rest login`: exchange `access_token` for `BhRestToken` and final `restUrl`.
- Refresh path uses `grant_type=refresh_token`.
- Existing session path only pings `restUrl/ping`.

#### Security Considerations

⚠️ **Important OAuth Flow Note**: 
- Bullhorn's headless/non-interactive authentication requires passing credentials as URL parameters to the `/authorize` endpoint
- This is a Bullhorn API requirement for server-to-server authentication (not standard OAuth 2.0)
- **The full authentication flow (with username/password) is only executed when necessary:**
  - If you provide existing tokens (REST or refresh tokens), they are used first
  - Credentials are only sent during the initial authentication or when all tokens have expired
  - Once authenticated, use the returned tokens for subsequent requests to avoid re-authentication

**Best Practices**:
- Always use HTTPS connections (enforced by the library)
- Store and reuse tokens securely to minimize authentication calls
- Sanitize application logs to prevent credential exposure in URL logs
- Use environment variables or secure vaults for credential storage
- Set appropriate token TTL values based on your security requirements

**Built-in Security Features**:
- URL encodes all inputs to prevent injection
- No credentials or tokens are stored by the library
- Timeouts via `AbortController` prevent hanging requests
- Optional bounded retries for 429/5xx with exponential backoff
- Internal logging is sanitized (no credentials/tokens exposed)
- Input validation prevents malformed requests

#### Environment variables (optional)
- Credentials
  - `BH_CLIENT_ID`
  - `BH_CLIENT_SECRET`
  - `BH_USERNAME`
  - `BH_PASSWORD`
- Tokens (optional)
  - `BH_REST_URL`
  - `BH_REST_TOKEN`
  - `BH_REFRESH_TOKEN`
  - `BH_ACCESS_TOKEN`
- Behavior
  - `BULLHORN_TTL`: TTL in days for REST login (default 30)
  - `THRESHOLD_REMAINING_MIN`: minimum per-minute remaining to accept an existing token (default 100)

#### Troubleshooting

**Common Issues:**

1. **`fetch is not defined` error**
   - **Cause**: Using Node.js version < 18
   - **Solution**: Upgrade to Node.js 18+ or install a fetch polyfill:
     ```bash
     npm install node-fetch
     ```
     Then add at the top of your code:
     ```js
     global.fetch = require('node-fetch');
     ```

2. **`Cannot find module 'dotenv'` error**
   - **Cause**: Using `.env` file without installing dotenv
   - **Solution**: Install the optional dotenv package:
     ```bash
     npm install dotenv
     ```

3. **HTTP 401 - Invalid credentials**
   - **Cause**: Incorrect username, password, or client credentials
   - **Solution**: Verify credentials with your Bullhorn administrator

4. **HTTP 429 - Too Many Requests**
   - **Cause**: Rate limit exceeded
   - **Solution**: 
     - Implement exponential backoff (built-in with `retries` option)
     - Increase `minRemainingThreshold` to re-auth earlier
     - Cache and reuse tokens between requests

5. **Timeout errors**
   - **Cause**: Slow network or Bullhorn API response
   - **Solution**: Increase timeout in configuration:
     ```js
     await loginToBullhorn(params, { 
       http: { timeoutMs: 60000 } // 60 seconds
     });
     ```

6. **`Insufficient input` error**
   - **Cause**: Missing required credentials or tokens
   - **Solution**: Ensure you provide one of:
     - `restUrl` + `restToken` (for validation)
     - `refreshToken` + client credentials (for refresh)
     - Full credentials (for new authentication)
     - `accessToken` + `restUrl` or username (for token exchange)

#### Performance Tips

- **Token Reuse**: Always check existing tokens first (fastest path)
- **Refresh Tokens**: Use refresh tokens to avoid sending passwords
- **Caching**: Store tokens securely and reuse them across requests
- **Rate Limiting**: Monitor the `minRemaining` value to avoid hitting limits
- **Parallel Requests**: Use the same authenticated session for multiple API calls

#### License
MIT
