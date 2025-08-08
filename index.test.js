const { loginToBullhorn } = require('./index.js');

// These are smoke tests that validate branching without calling Bullhorn.
// We mock fetch to avoid network activity.

describe('bullhorn-auth-client flow selection', () => {
  const realFetch = global.fetch;

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    global.fetch = realFetch;
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  function setupFetchSequence(responses) {
    let i = 0;
    global.fetch = jest.fn().mockImplementation(async () => {
      const r = responses[i++] || responses[responses.length - 1];
      // emulate minimal Response interface
      return {
        status: r.status || 200,
        statusText: r.statusText || 'OK',
        headers: new Map(Object.entries(r.headers || {})),
        json: async () => r.json,
        clone: function() { return { json: async () => r.json }; }
      };
    });
  }

  test('uses existing token when ping above threshold', async () => {
    setupFetchSequence([
      { status: 200, headers: { 'x-ratelimit-remaining-minute': '500' }, json: {} }
    ]);
    const res = await loginToBullhorn({ tokens: { restUrl: 'https://rest', restToken: 'T' } }, { minRemainingThreshold: 100 });
    expect(res.method).toBe('existing');
    expect(res.restUrl).toBe('https://rest');
    expect(res.restToken).toBe('T');
  });

  test('refresh path when ping fails and refresh succeeds', async () => {
    setupFetchSequence([
      { status: 401, json: {} }, // ping fails
      { status: 200, json: { oauthUrl: 'https://oauth', restUrl: 'https://rest' } }, // loginInfo
      { status: 200, json: { access_token: 'A', refresh_token: 'R2' } }, // step0
      { status: 200, json: { restUrl: 'https://rest', BhRestToken: 'RT' } } // step3
    ]);
    const res = await loginToBullhorn({
      credentials: { clientId: 'id', clientSecret: 'sec', username: 'u', password: 'p' },
      tokens: { restUrl: 'https://rest', restToken: 'bad', refreshToken: 'R1' }
    });
    expect(res.method).toBe('refresh');
    expect(res.restToken).toBe('RT');
  });

  test('access token shortcut', async () => {
    setupFetchSequence([
      { status: 200, json: { restUrl: 'https://rest', BhRestToken: 'RT' } }
    ]);
    const res = await loginToBullhorn({ tokens: { restUrl: 'https://rest', accessToken: 'A' } });
    expect(res.method).toBe('access');
    expect(res.restToken).toBe('RT');
  });

  test('full login when no tokens available', async () => {
    setupFetchSequence([
      { status: 200, json: { oauthUrl: 'https://oauth', restUrl: 'https://rest' } },
      { status: 302, headers: { location: 'https://cb?code=CODE' }, json: {} },
      { status: 200, json: { access_token: 'A', refresh_token: 'R' } },
      { status: 200, json: { restUrl: 'https://rest', BhRestToken: 'RT' } }
    ]);
    const res = await loginToBullhorn({ credentials: { clientId: 'id', clientSecret: 'sec', username: 'u', password: 'p' } });
    expect(res.method).toBe('full');
    expect(res.restToken).toBe('RT');
  });
});
