export interface BullhornCredentials {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string; // plain text; will be URI-encoded internally
}

export interface TokenInput {
  restUrl?: string;
  restToken?: string;
  refreshToken?: string;
  accessToken?: string; // optional; if provided and valid we can skip to step3
}

export interface AuthConfig {
  ttlDays?: number; // default 30
  minRemainingThreshold?: number; // used with ping; default 100
  http?: {
    retries?: number; // default 0
    timeoutMs?: number; // default 30000
    userAgent?: string; // default "bullhorn-auth-client"
    onRetryAttempt?: (info: { attempt: number; status?: number }) => void;
  };
}

export interface AuthResult {
  restUrl: string;
  restToken: string;
  refreshToken?: string;
  accessToken?: string;
  minRemaining?: string;
  method: "existing" | "refresh" | "full" | "access";
}

export declare function loginToBullhorn(
  params: {
    credentials?: BullhornCredentials;
    tokens?: TokenInput;
  },
  config?: AuthConfig
): Promise<AuthResult>;
