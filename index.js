/* global process, fetch */
const url = require("url");
const qs = require("querystring");

// Create a preconfigured axios instance similar to the Lambda
function createHttpOptions(httpCfg = {}) {
  return {
    timeoutMs: Number.isFinite(httpCfg.timeoutMs) ? httpCfg.timeoutMs : 30000,
    userAgent: httpCfg.userAgent || "bullhorn-auth-client",
    retries: Number.isFinite(httpCfg.retries) ? httpCfg.retries : 0,
    onRetryAttempt: typeof httpCfg.onRetryAttempt === "function" ? httpCfg.onRetryAttempt : null
  };
}

async function doFetch(urlStr, init, httpOpts) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), httpOpts.timeoutMs);
  try {
    const headers = init?.headers;
    const res = await fetch(urlStr, { ...init, headers, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

async function requestWithRetry(urlStr, init, httpOpts) {
  let attempt = 0;
  let lastError;
  while (attempt <= httpOpts.retries) {
    try {
      const res = await doFetch(urlStr, init, httpOpts);
      if (res.status >= 500 || res.status === 429) {
        throw Object.assign(new Error(`HTTP ${res.status}`), { response: res });
      }
      return res;
    } catch (err) {
      lastError = err;
      attempt += 1;
      if (attempt > httpOpts.retries) break;
      if (httpOpts.onRetryAttempt) {
        try { httpOpts.onRetryAttempt({ attempt, status: err?.response?.status }); } catch (_) {}
      }
      const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 4000);
      await new Promise(r => setTimeout(r, backoffMs));
    }
  }
  throw lastError;
}

function basicLogFromResponse(res) {
  return {
    status: res.status,
    statusText: res.statusText,
    headers: {
      "x-ratelimit-limit-minute": res.headers.get("x-ratelimit-limit-minute"),
      "x-ratelimit-remaining-minute": res.headers.get("x-ratelimit-remaining-minute")
    }
  };
}

async function loginInfo(httpOpts, username) {
  const safeUser = encodeURIComponent(username);
  const urlStr = `https://rest.bullhornstaffing.com/rest-services/loginInfo?username=${safeUser}`;
  const response = await requestWithRetry(urlStr, { method: "GET" }, httpOpts);
  return {
    oauthUrl: (await response.clone().json()).oauthUrl,
    restUrl: (await response.json()).restUrl,
    raw: basicLogFromResponse(response)
  };
}

async function step0(httpOpts, oauthUrl, refreshToken, clientId, clientSecret) {
  try {
    const urlStr = `${oauthUrl}/token?grant_type=refresh_token&refresh_token=${refreshToken}&client_id=${clientId}&client_secret=${clientSecret}`;
    const response = await requestWithRetry(urlStr, { method: "POST" }, httpOpts);
    const body = await response.json();
    return {
      ok: true,
      accessToken: body.access_token,
      refreshToken: body.refresh_token,
      raw: basicLogFromResponse(response)
    };
  } catch (error) {
    const status = error?.response?.status;
    return { ok: false, status, raw: { status } };
  }
}

async function step1(httpOpts, oauthUrl, clientId, username, password) {
  const urlStr = `${oauthUrl}/authorize?client_id=${clientId}&response_type=code&action=Login&username=${encodeURIComponent(
    username
  )}&password=${encodeURIComponent(password)}`;
  const response = await requestWithRetry(urlStr, { method: "GET", redirect: "manual", headers: { "Content-Type": "application/x-www-form-urlencoded" } }, httpOpts);
  const location = response.headers.get("location");
  const parsedURL = url.parse(location);
  const tmpAuthCode = qs.parse(parsedURL.query).code;
  return { tmpAuthCode, raw: basicLogFromResponse(response) };
}

async function step2(httpOpts, oauthUrl, clientId, clientSecret, tmpAuthCode) {
  const urlStr = `${oauthUrl}/token?grant_type=authorization_code&client_id=${clientId}&client_secret=${clientSecret}&code=${tmpAuthCode}`;
  const response = await requestWithRetry(urlStr, { method: "POST" }, httpOpts);
  const body = await response.json();
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    raw: basicLogFromResponse(response)
  };
}

async function step3(httpOpts, restUrl, accessToken, ttlDays) {
  const ttl = Number.isFinite(ttlDays) ? ttlDays : Number(process.env.BULLHORN_TTL || 30);
  const urlStr = `${restUrl}/login?version=*&access_token=${accessToken}&ttl=${ttl}`;
  const response = await requestWithRetry(urlStr, { method: "POST" }, httpOpts);
  const body = await response.json();
  return {
    restUrl: body.restUrl,
    restToken: body.BhRestToken,
    raw: basicLogFromResponse(response)
  };
}

async function ping(httpOpts, restUrl, restToken) {
  try {
    const urlStr = `${restUrl}/ping`;
    const response = await requestWithRetry(urlStr, { method: "GET", headers: { BhRestToken: restToken } }, httpOpts);
    const log = basicLogFromResponse(response);
    const minRemaining = response.headers.get("x-ratelimit-remaining-minute");
    return { ok: true, minRemaining: minRemaining ?? log?.headers?.["x-ratelimit-remaining-minute"], raw: log };
  } catch (error) {
    const status = error?.response?.status;
    return { ok: false, status, raw: { status } };
  }
}

function encodePasswordIfNeeded(password) {
  const encoded = encodeURIComponent(password);
  return encoded === password ? password : password;
}

function credentialsFromEnv(env = process.env) {
  const clientId = env.BH_CLIENT_ID;
  const clientSecret = env.BH_CLIENT_SECRET;
  const username = env.BH_USERNAME;
  const password = env.BH_PASSWORD;
  if (clientId && clientSecret && username && password) {
    return { clientId, clientSecret, username, password };
  }
  return null;
}

function tokensFromEnv(env = process.env) {
  const tokens = {
    restUrl: env.BH_REST_URL,
    restToken: env.BH_REST_TOKEN,
    refreshToken: env.BH_REFRESH_TOKEN,
    accessToken: env.BH_ACCESS_TOKEN
  };
  Object.keys(tokens).forEach((k) => {
    if (tokens[k] === undefined) delete tokens[k];
  });
  return tokens;
}

/**
 * Login to Bullhorn using the most efficient path.
 * - If tokens.restToken (+ restUrl) provided, ping it; if above threshold, return.
 * - If refreshToken present, attempt refresh (step0) then step3.
 * - Else full login: loginInfo -> step1 -> step2 -> step3.
 *
 * Returns { restUrl, restToken, refreshToken?, accessToken?, minRemaining?, method }.
 */
async function loginToBullhorn(params, config = {}) {
  const httpOpts = createHttpOptions(config.http || {});
  const threshold = Number(config.minRemainingThreshold ?? process.env.THRESHOLD_REMAINING_MIN ?? 100);
  const ttlDays = Number(config.ttlDays ?? process.env.BULLHORN_TTL ?? 30);

  const tokens = params.tokens ?? {};
  const creds = params.credentials;

  // If we have a restToken + restUrl, try ping first
  if (tokens.restToken && tokens.restUrl) {
    const pingResult = await ping(httpOpts, tokens.restUrl, tokens.restToken);
    if (pingResult.ok) {
      const remaining = parseInt(pingResult.minRemaining ?? "0", 10);
      if (Number.isFinite(remaining) && remaining > threshold) {
        return {
          restUrl: tokens.restUrl,
          restToken: tokens.restToken,
          refreshToken: tokens.refreshToken,
          accessToken: tokens.accessToken,
          minRemaining: String(pingResult.minRemaining ?? ""),
          method: "existing"
        };
      }
    }
  }

  // If refresh is possible, we need oauth/rest URLs first (loginInfo)
  if (tokens.refreshToken && creds?.clientId && creds?.clientSecret && creds?.username) {
    const { oauthUrl, restUrl } = await loginInfo(httpOpts, creds.username);
    const r0 = await step0(httpOpts, oauthUrl, tokens.refreshToken, creds.clientId, creds.clientSecret);
    if (r0.ok) {
      const r3 = await step3(httpOpts, restUrl, r0.accessToken, ttlDays);
      return {
        restUrl: r3.restUrl,
        restToken: r3.restToken,
        refreshToken: r0.refreshToken,
        accessToken: r0.accessToken,
        method: "refresh"
      };
    }
    // fall through to full login when refresh fails
  }

  // Shortcut: if accessToken is provided, try to exchange it for a REST session
  if (tokens.accessToken) {
    // Prefer provided restUrl; otherwise derive from username via loginInfo
    let restUrl = tokens.restUrl;
    if (!restUrl && creds?.username) {
      const info = await loginInfo(httpOpts, creds.username);
      restUrl = info.restUrl;
    }
    if (!restUrl) {
      throw new Error("accessToken provided but restUrl (or credentials.username to derive it) is missing");
    }
    const s3 = await step3(httpOpts, restUrl, tokens.accessToken, ttlDays);
    return {
      restUrl: s3.restUrl,
      restToken: s3.restToken,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      method: "access"
    };
  }

  // Full login requires full credentials
  if (!creds || !creds.clientId || !creds.clientSecret || !creds.username || !creds.password) {
    throw new Error("Insufficient input: provide either (restUrl+restToken) or (refreshToken+client creds) or full credentials");
  }

  const { oauthUrl, restUrl } = await loginInfo(httpOpts, creds.username);
  const s1 = await step1(httpOpts, oauthUrl, creds.clientId, creds.username, creds.password);
  const s2 = await step2(httpOpts, oauthUrl, creds.clientId, creds.clientSecret, s1.tmpAuthCode);
  const s3 = await step3(httpOpts, restUrl, s2.accessToken, ttlDays);

  return {
    restUrl: s3.restUrl,
    restToken: s3.restToken,
    refreshToken: s2.refreshToken,
    accessToken: s2.accessToken,
    method: "full"
  };
}

module.exports = { loginToBullhorn, credentialsFromEnv, tokensFromEnv };
