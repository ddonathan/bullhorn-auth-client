### bullhorn-auth-client

Lightweight Node.js client to obtain a Bullhorn REST session (BhRestToken) efficiently. No external HTTP dependencies.

- Accepts either:
  - Existing `restUrl` + `restToken` (pings and returns if still valid), optionally `refreshToken`.
  - `refreshToken` plus client credentials (`clientId`, `clientSecret`, `username`) to refresh.
  - Full credentials (`clientId`, `clientSecret`, `username`, `password`) for a full auth flow.
  - Access token shortcut: `accessToken` (+ `restUrl` or `credentials.username` to derive) to jump straight to REST login.
- Returns `restUrl`, `restToken`, and when available `refreshToken`, `accessToken`, and `minRemaining`.

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
```

#### Flow details (non-interactive)
- `loginInfo`: fetches `oauthUrl`/`restUrl` given a username.
- `authorize`: GET with `action=Login&username&password`, manual redirect; parse `code` from Location header.
- `token`: exchange `code` for `access_token` and `refresh_token`.
- `rest login`: exchange `access_token` for `BhRestToken` and final `restUrl`.
- Refresh path uses `grant_type=refresh_token`.
- Existing session path only pings `restUrl/ping`.

#### Security & resilience
- Uses HTTPS endpoints; URL encodes inputs.
- No secrets are stored; only what you pass in.
- Timeouts via `AbortController`.
- Optional bounded retries for 429/5xx with exponential backoff.
- Internal logging is sanitized (no credentials/tokens).

#### Environment variables (optional)
- `BULLHORN_TTL`: TTL in days for REST login (default 30)
- `THRESHOLD_REMAINING_MIN`: minimum per-minute remaining to accept an existing token (default 100)

#### License
MIT
