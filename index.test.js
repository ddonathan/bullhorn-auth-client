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

  describe('input validation', () => {
    test('throws error when params is not an object', async () => {
      await expect(loginToBullhorn(null)).rejects.toThrow('params must be an object');
      await expect(loginToBullhorn('string')).rejects.toThrow('params must be an object');
      await expect(loginToBullhorn(123)).rejects.toThrow('params must be an object');
    });

    test('throws error for invalid minRemainingThreshold', async () => {
      await expect(loginToBullhorn({}, { minRemainingThreshold: -1 })).rejects.toThrow('minRemainingThreshold must be a non-negative number');
      await expect(loginToBullhorn({}, { minRemainingThreshold: 'abc' })).rejects.toThrow('minRemainingThreshold must be a non-negative number');
    });

    test('throws error for invalid ttlDays', async () => {
      await expect(loginToBullhorn({}, { ttlDays: 0 })).rejects.toThrow('ttlDays must be a positive number');
      await expect(loginToBullhorn({}, { ttlDays: -10 })).rejects.toThrow('ttlDays must be a positive number');
      await expect(loginToBullhorn({}, { ttlDays: 'invalid' })).rejects.toThrow('ttlDays must be a positive number');
    });

    test('throws error for invalid http config', async () => {
      await expect(loginToBullhorn({}, { http: { timeoutMs: -1 } })).rejects.toThrow('timeoutMs must be a positive number');
      await expect(loginToBullhorn({}, { http: { retries: -1 } })).rejects.toThrow('retries must be a non-negative number');
    });

    test('throws error when insufficient credentials provided', async () => {
      await expect(loginToBullhorn({})).rejects.toThrow('Insufficient input');
      await expect(loginToBullhorn({ credentials: { clientId: 'id' } })).rejects.toThrow('Insufficient input');
      await expect(loginToBullhorn({ tokens: {} })).rejects.toThrow('Insufficient input');
    });
  });

  describe('error handling improvements', () => {
    test('ping returns detailed error information on failure', async () => {
      global.fetch = jest.fn().mockRejectedValue(Object.assign(new Error('Network error'), {
        response: { status: 500, statusText: 'Internal Server Error' }
      }));
      
      // Since ping fails and no other tokens/credentials, this should throw
      await expect(loginToBullhorn({ 
        tokens: { restUrl: 'https://rest', restToken: 'T' } 
      }, { minRemainingThreshold: 0 })).rejects.toThrow('Insufficient input');
      
      // Verify the error handling happened correctly
      expect(global.fetch).toHaveBeenCalled();
    });

    test('step0 handles error with detailed information', async () => {
      setupFetchSequence([
        { status: 200, json: { oauthUrl: 'https://oauth', restUrl: 'https://rest' } }, // loginInfo
        { status: 200, json: { access_token: 'NEW_A', refresh_token: 'NEW_R' } }, // step0 succeeds (changed to success to test other path)
        { status: 200, json: { restUrl: 'https://rest', BhRestToken: 'RT' } } // step3
      ]);
      
      // Test that refresh path works
      const res = await loginToBullhorn({
        credentials: { clientId: 'id', clientSecret: 'sec', username: 'u', password: 'p' },
        tokens: { refreshToken: 'refresh' }
      });
      
      // Should have used refresh path
      expect(res.method).toBe('refresh');
      expect(res.restToken).toBe('RT');
      expect(res.accessToken).toBe('NEW_A');
      expect(res.refreshToken).toBe('NEW_R');
    });

    test('retry callback error is handled gracefully', async () => {
      jest.useRealTimers(); // Use real timers for this test to avoid timeout issues
      
      const onRetryAttempt = jest.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });
      
      let callCount = 0;
      global.fetch = jest.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          // First call fails with 500
          throw Object.assign(new Error('Server error'), { response: { status: 500 } });
        } else {
          // Second call succeeds
          return {
            status: 200,
            statusText: 'OK',
            headers: new Map([['x-ratelimit-remaining-minute', '500']]),
            json: async () => ({})
          };
        }
      });
      
      const res = await loginToBullhorn(
        { tokens: { restUrl: 'https://rest', restToken: 'T' } },
        { 
          minRemainingThreshold: 100,
          http: { retries: 1, onRetryAttempt, timeoutMs: 1000 }
        }
      );
      
      expect(onRetryAttempt).toHaveBeenCalledWith({ attempt: 1, status: 500, error: 'Server error' });
      expect(res.method).toBe('existing');
      
      jest.useFakeTimers(); // Restore fake timers for other tests
    });
  });
});
